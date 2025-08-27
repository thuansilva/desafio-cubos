import express, { Request, Response } from "express";
import authMiddleware from "./authMiddleware";
import { uploadToS3 } from "./s3Middleware";
import multer from "multer";
import { MovieRepositoryDatabase } from "./MovieRepository";
import cors from "cors";
import { LoginRepositoryDatabase } from "./LoginRepository";
import { UserRepositoryDatabase } from "./UserRepository";
import { PgPromiseAdapter } from "./DatabaseConnection";
import CreateMovie from "./CreateMovie";
import GetMovie from "./GetMovie";
import DeleteMovie from "./DeleteMovie";
import UpdateMovie from "./UpdateMovie";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/movies", authMiddleware);
const upload = multer({ storage: multer.memoryStorage() });

const databaseConnection = new PgPromiseAdapter();
const loginRepository = new LoginRepositoryDatabase(databaseConnection);
const userRepository = new UserRepositoryDatabase(databaseConnection);
const movieRepository = new MovieRepositoryDatabase(databaseConnection);
const createMovie = new CreateMovie(movieRepository, loginRepository);
const getMovie = new GetMovie(movieRepository);
const deleteMovie = new DeleteMovie(movieRepository);
const updateMovie = new UpdateMovie(movieRepository);

app.post("/movies", async (req: any, res: Response) => {
  const movie = req.body;
  const userId = req.user.id;
  try {
    const movieDate = await createMovie.execute(movie, userId);

    res.status(201).json({
      movie_id: movieDate.movie_id,
      user_id: movieDate.user_id,
    });
    return;
  } catch (error: any) {
    res.status(400).json({ error: error.message });
    return;
  }
});

app.get("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const getOneMovie = await getMovie.GetOneMovie(id, userId);
    res.json(getOneMovie);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
    return;
  }
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
  try {
    const result = await getMovie.GetAllMovie(
      {
        page,
        limit,
        movie_date_lauch_start,
        movie_date_lauch_end,
        movie_duration: Number(movie_duration),
        movie_popularity,
      },
      userId
    );
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    await deleteMovie.executeDelete(id, userId);
    res.status(204).send();
  } catch (error: any) {
    res.status(404).json({ error: error.message });
    return;
  }
});

app.put("/movies/:id", async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user.id;
  const movieUpdates = req.body;
  console.log("movieUpdates", movieUpdates);

  try {
    const updatedMovie = await updateMovie.update(movieUpdates, id, userId);
    res.status(200).json(updatedMovie);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// usuários
app.post("/users", async (req: Request, res: Response) => {
  const { user_name, user_email, user_password } = req.body;

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
