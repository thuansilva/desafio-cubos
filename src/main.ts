import express, { Request, Response } from "express";
import crypto from "crypto";
import pgp from "pg-promise";
import bcrypt from "bcrypt";
import authMiddleware from "./authMiddleware";
import jwt from "jsonwebtoken";
import { sendEmail } from "./emailService";
import { uploadToS3 } from "./s3Middleware";
import multer from "multer";

const app = express();
app.use(express.json());
app.use("/movies", authMiddleware);
const upload = multer({ storage: multer.memoryStorage() });

const connection = pgp()("postgres://postgres:123456@localhost:5432/app");

app.post("/movies", async (req: any, res: Response) => {
  const movie = req.body;
  const userId = req.user.id;

  const requiredFields = ["movie_date_lauch", "movie_duration"];
  const missingFields = requiredFields.filter((field) => !movie[field]);
  if (missingFields.length > 0) {
    res
      .status(400)
      .json({ error: "Campos obrigatórios faltando", missingFields });
    return;
  }

  const checkUserQuery = `SELECT user_email, user_name FROM cubosmovie.user WHERE user_id = $1`;
  const existingUser = await connection.oneOrNone(checkUserQuery, [userId]);

  if (!existingUser) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  movie.movie_id = crypto.randomUUID();
  movie.user_id = userId;

  try {
    const addMovieQuery = `
        INSERT INTO cubosmovie.movie (
          movie_id,
          user_id,
          movie_title,
          movie_sinopse,
          movie_popularity,
          movie_date_lauch,
          movie_duration,
          movie_situation,
          movie_language,
          movie_genre,
          movie_budget,
          movie_revenue,
          movie_description,
          movie_image_url,
          movie_trailer_url,
          movie_porcentage_like
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      `;

    await connection.query(addMovieQuery, [
      movie.movie_id,
      movie.user_id,
      movie.movie_title,
      movie.movie_sinopse,
      movie.movie_popularity,
      movie.movie_date_lauch,
      movie.movie_duration,
      movie.movie_situation,
      movie.movie_language,
      movie.movie_genre,
      movie.movie_budget,
      movie.movie_revenue,
      movie.movie_description,
      movie.movie_image_url,
      movie.movie_trailer_url,
      movie.movie_porcentage_like,
    ]);
  } catch (dbError) {
    res.status(500).json({ error: "Erro interno ao salvar o filme." });
    return;
  }

  const launchDate = new Date(movie.movie_date_lauch);
  const nowDate = new Date();
  const isFuture = launchDate > nowDate;

  if (isFuture) {
    try {
      await sendEmail(
        existingUser.user_email,
        `Lembrete: estreia do filme ${movie.movie_title}`,
        `Seu filme ${movie.movie_title} estreia em ${new Date(
          movie.movie_date_lauch
        ).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}`
      );
    } catch (emailError) {}
  }

  res.status(201).json({
    movie_id: movie.movie_id,
    user_id: movie.user_id,
  });
});

app.get("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const getMovieQuery = `
    SELECT * 
    FROM cubosmovie.movie 
    WHERE movie_id = $1 AND user_id = $2
  `;

  const movie = await connection.oneOrNone(getMovieQuery, [id, userId]);

  if (!movie) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }

  res.json(movie);
});

app.get("/movies", async (req: any, res: Response) => {
  const {
    page = "1",
    limit = "10",
    movie_date_lauch_start,
    movie_date_lauch_end,
    movie_duration,
    movie_popularity,
  } = req.query;
  const userId = req.user.id;

  // 🔎 Validação obrigatória
  if (!movie_date_lauch_start || !movie_date_lauch_end || !movie_duration) {
    res.status(400).json({
      error:
        "Filtros obrigatórios faltando. É necessário informar movie_date_lauch_start, movie_date_lauch_end e movie_duration",
    });
    return;
  }

  const pageNumber = parseInt(page as string, 10);
  const limitNumber = parseInt(limit as string, 10);
  const offset = (pageNumber - 1) * limitNumber;

  // sempre filtra pelo usuário
  let whereClauses: string[] = [`user_id = $1`];
  let queryParams: any[] = [userId];

  // 🔎 Obrigatórios
  queryParams.push(movie_date_lauch_start, movie_date_lauch_end);
  whereClauses.push(
    `movie_date_lauch BETWEEN $${queryParams.length - 1} AND $${
      queryParams.length
    }`
  );

  queryParams.push(movie_duration);
  whereClauses.push(`movie_duration = $${queryParams.length}`);

  // 🔎 Opcional
  if (movie_popularity) {
    queryParams.push(movie_popularity);
    whereClauses.push(`movie_popularity = $${queryParams.length}`);
  }

  // Query de listagem
  let getMoviesQuery = `SELECT * FROM cubosmovie.movie WHERE ${whereClauses.join(
    " AND "
  )}`;
  queryParams.push(limitNumber, offset);
  getMoviesQuery += ` LIMIT $${queryParams.length - 1} OFFSET $${
    queryParams.length
  }`;

  const movies = await connection.manyOrNone(getMoviesQuery, queryParams);

  // Query de contagem
  let totalQuery = `SELECT COUNT(*) FROM cubosmovie.movie WHERE ${whereClauses.join(
    " AND "
  )}`;
  const totalResult = await connection.one(
    totalQuery,
    queryParams.slice(0, -2)
  );
  const total = parseInt(totalResult.count, 10);

  res.json({
    page: pageNumber,
    limit: limitNumber,
    total,
    totalPages: Math.ceil(total / limitNumber),
    data: movies,
  });
});

app.delete("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const deleteMovieQuery = `
    DELETE FROM cubosmovie.movie
    WHERE movie_id = $1 AND user_id = $2
  `;

  const result = await connection.result(deleteMovieQuery, [id, userId]);

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Filme não encontrado" });
    return;
  }

  res.status(204).send();
});

app.put("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const movieUpdates = req.body;
  const userId = req.user.id;

  const allowedFields = [
    "movie_title",
    "movie_sinopse",
    "movie_popularity",
    "movie_date_lauch",
    "movie_duration",
    "movie_situation",
    "movie_language",
    "movie_genre",
    "movie_budget",
    "movie_revenue",
    "movie_description",
    "movie_image_url",
    "movie_trailer_url",
    "movie_porcentage_like",
  ];

  const setClauses: string[] = [];
  const queryParams: any[] = [];

  Object.entries(movieUpdates).forEach(([key, value]) => {
    if (allowedFields.includes(key)) {
      queryParams.push(value);
      setClauses.push(`${key} = $${queryParams.length}`);
    }
  });

  if (setClauses.length === 0) {
    res.status(400).json({ error: "Nenhum campo válido para atualizar" });
    return;
  }

  queryParams.push(id, userId);

  const updateMovieQuery = `
    UPDATE cubosmovie.movie
    SET ${setClauses.join(", ")}
    WHERE movie_id = $${queryParams.length - 1} AND user_id = $${
    queryParams.length
  }
  `;

  const result = await connection.result(updateMovieQuery, queryParams);

  if (result.rowCount === 0) {
    res.status(404).json({ error: "Filme não encontrado" });
    return;
  }

  res.status(200).json({ message: "Filme atualizado com sucesso" });
});

// usuários
app.post("/users", async (req: Request, res: Response) => {
  const { user_name, user_email, user_password } = req.body;
  const user_id = crypto.randomUUID();

  if (!user_name) {
    res.status(400).json({ error: "Nome é obrigatório" });
    return;
  }

  if (!user_email) {
    res.status(400).json({ error: "Email é obrigatório" });
    return;
  }

  if (!user_password) {
    res.status(400).json({ error: "Senha é obrigatória" });
    return;
  }

  const checkEmailQuery = `
    SELECT 1 FROM cubosmovie.user WHERE user_email = $1
  `;
  const existingUser = await connection.oneOrNone(checkEmailQuery, [
    user_email,
  ]);

  if (existingUser) {
    res.status(400).json({ error: "Email já cadastrado" });
    return;
  }

  const hashedPassword = await bcrypt.hash(user_password, 10);

  const insertUserQuery = `
    INSERT INTO cubosmovie.user (user_id, user_name, user_email, user_password)
    VALUES ($1, $2, $3, $4)
  `;

  await connection.query(insertUserQuery, [
    user_id,
    user_name,
    user_email,
    hashedPassword,
  ]);

  res.status(201).json({ user_id, user_name, user_email });
});

app.post("/login", async (req: Request, res: Response) => {
  const { user_email, user_password } = req.body;

  if (!user_email || !user_password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const getUserQuery = `
    SELECT * FROM cubosmovie.user WHERE user_email = $1
  `;

  const user = await connection.oneOrNone(getUserQuery, [user_email]);

  if (!user) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const passwordMatch = await bcrypt.compare(user_password, user.user_password);

  if (!passwordMatch) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = jwt.sign(
    { id: user.user_id },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1h",
    }
  );

  res.json({ token });
});

app.post(
  "/movies/upload",
  upload.single("image"),
  async (req: any, res: any) => {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo não enviado" });
    }

    try {
      const url = await uploadToS3(req.file);
      console.log("url", url);
      res.status(200).json({ url });
      return;
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao enviar arquivo" });
    }
  }
);

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});

export { app };
