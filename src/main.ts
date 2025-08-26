import express, { Request, Response } from "express";
import crypto from "crypto";
import pgp from "pg-promise";
import bcrypt from "bcrypt";
import authMiddleware from "./authMiddleware";
import jwt from "jsonwebtoken";
import { sendEmail } from "./emailService";
import { uploadToS3 } from "./s3Middleware";
import multer from "multer";
import { MovieRepositoryDatabase } from "./MovieRepository";
import cors from "cors";
import { LoginRepositoryDatabase } from "./LoginRepository";
import { UserRepositoryDatabase } from "./UserRepository";
import { PgPromiseAdapter } from "./DatabaseConnection";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/movies", authMiddleware);
const upload = multer({ storage: multer.memoryStorage() });

// const connection = pgp()("postgres://postgres:123456@localhost:5432/app");

const databaseConnection = new PgPromiseAdapter();
const loginRepository = new LoginRepositoryDatabase(databaseConnection);
const userRepository = new UserRepositoryDatabase(databaseConnection);
const movieRepository = new MovieRepositoryDatabase(databaseConnection);
databaseConnection.close();

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

  const movieDate = await movieRepository.save(movie, userId);

  const launchDate = new Date(movie.movie_date_lauch);
  const nowDate = new Date();
  const isFuture = launchDate > nowDate;

  if (isFuture) {
    try {
      await sendEmail(
        movieDate.user_email,
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
    movie_id: movieDate.movie_id,
    user_id: movieDate.user_id,
  });
});

app.get("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const movie = await movieRepository.getWithOneMovie(id, userId);
  if (!movie) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }
  res.json(movie);
});

app.get("/movies", async (req: any, res: Response) => {
  const {
    page,
    limit,
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

  try {
    const result = await movieRepository.getAllMovie(userId, {
      page,
      limit,
      movie_date_lauch_start,
      movie_date_lauch_end,
      movie_duration,
      movie_popularity,
    });

    res.json(result);
  } catch (err: any) {
    res
      .status(500)
      .json({ error: "Erro ao buscar filmes", details: err.message });
  }
});

app.delete("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  const movie = await movieRepository.deleteMovie(id, userId);

  if (movie.rowCount === 0) {
    res.status(404).json({ error: "Filme não encontrado" });
    return;
  }

  res.status(204).send();
});

app.put("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const movieUpdates = req.body;

  try {
    const updatedMovie = await movieRepository.updateMovie(
      movieUpdates,
      id,
      userId
    );

    if (!updatedMovie) {
      res.status(404).json({ error: "Filme não encontrado" });
      return;
    }

    res.status(200).json(updatedMovie);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
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

  try {
    const newUser = await userRepository.save(
      user_email,
      user_password,
      user_name
    );
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.message === "Email já cadastrado") {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Erro ao cadastrar usuário" });
    }
    return;
  }

  // const checkEmailQuery = `
  //   SELECT 1 FROM cubosmovie.user WHERE user_email = $1
  // `;
  // const existingUser = await connection.oneOrNone(checkEmailQuery, [
  //   user_email,
  // ]);

  // if (existingUser) {
  //   res.status(400).json({ error: "Email já cadastrado" });
  //   return;
  // }

  // const hashedPassword = await bcrypt.hash(user_password, 10);

  // const insertUserQuery = `
  //   INSERT INTO cubosmovie.user (user_id, user_name, user_email, user_password)
  //   VALUES ($1, $2, $3, $4)
  // `;

  // res.status(201).json({ user_id, user_name, user_email });

  //
});

app.post("/login", async (req: Request, res: Response) => {
  const { user_email, user_password } = req.body;

  if (!user_email || !user_password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  try {
    const token = await loginRepository.authenticate(user_email, user_password);
    res.json({ token });
  } catch (error) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  // const getUserQuery = `
  //   SELECT * FROM cubosmovie.user WHERE user_email = $1
  // `;

  // const user = await connection.oneOrNone(getUserQuery, [user_email]);

  // if (!user) {
  //   res.status(401).json({ error: "Credenciais inválidas" });
  //   return;
  // }

  // const passwordMatch = await bcrypt.compare(user_password, user.user_password);

  // if (!passwordMatch) {
  //   res.status(401).json({ error: "Credenciais inválidas" });
  //   return;
  // }

  // const token = jwt.sign(
  //   { id: user.user_id },
  //   process.env.JWT_SECRET as string,
  //   {
  //     expiresIn: "1h",
  //   }
  // );
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
  console.log("Server is running on port 4000");
});

export { app };
