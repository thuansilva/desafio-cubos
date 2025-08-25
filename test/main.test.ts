import dotenv from "dotenv";
dotenv.config();
import supertest from "supertest";
import { app } from "../src/main";
import axios from "axios";
import { beforeAll, describe, expect, jest, test } from "@jest/globals";
import { faker } from "@faker-js/faker";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import FormData from "form-data";

// import { sendEmail } from "../src/emailService";
import * as emailService from "../src/emailService";

axios.defaults.validateStatus = () => true;

let token: string;
let user_id: string;
// const mockedSendEmail = sendEmail as jest.Mock;

beforeAll(async () => {
  // Cria usuário normalmente pelo backend
  const userData = {
    user_name: faker.internet.username(),
    user_email: faker.internet.email(),
    user_password: faker.internet.password(),
  };

  // const response = await axios.post("http://localhost:3000/users", userData);
  const response = await supertest(app).post("/users").send(userData);
  user_id = response.body.user_id;
  token = jwt.sign({ id: user_id }, process.env.JWT_SECRET as string);
});

const movie = {
  movie_title: "Aventura nas Estrelas",
  movie_sinopse:
    "Um grupo de exploradores viaja pelo espaço em busca de novos mundos e segredos antigos.",
  movie_popularity: 8.7,
  movie_date_lauch: "2024-12-01T00:00:00Z",
  movie_duration: 142, // duração em minutos
  movie_situation: "Lançamento",
  movie_language: "Português",
  movie_genre: ["Aventura", "Ficção Científica", "Família"],
  movie_budget: 120000000, // em dólares
  movie_revenue: 350000000, // em dólares
  movie_description:
    "Um épico espacial que combina ação, emoção e efeitos visuais impressionantes. Ideal para toda a família.",
  movie_image_url: "https://exemplo.com/imagens/aventura_nas_estrelas.jpg",
  movie_trailer_url: "https://exemplo.com/trailer/aventura_nas_estrelas.mp4",
  movie_porcentage_like: 92.5,
};

describe.skip("Comportamentos do usuário", () => {
  const userData = {
    user_name: faker.internet.username(),
    user_email: faker.internet.email(),
    user_password: faker.internet.password(),
  };
  //Usuários
  test("Deve criar um usuário e retornar o ID gerado", async () => {
    const responseCreate = await axios.post(
      "http://localhost:3000/users",
      userData
    );
    const { user_id } = responseCreate.data;

    expect(responseCreate.status).toBe(201);
    expect(user_id).toBeDefined();
  });

  test("Não deve criar usuário com o mesmo email", async () => {
    const responseCrete = await axios.post(
      "http://localhost:3000/users",
      userData
    );
    expect(responseCrete.status).toBe(400);
    expect(responseCrete.data.error).toBe("Email já cadastrado");
  });

  test("Não deve criar usuário com dados vazios", async () => {
    const responseCrete = await axios.post("http://localhost:3000/users", {});
    console.log(responseCrete.data);
    expect(responseCrete.status).toBe(400);
  });
});

describe("Login", () => {
  test("Deve fazer login com sucesso", async () => {
    const userData = {
      user_name: faker.internet.username(),
      user_email: faker.internet.email(),
      user_password: faker.internet.password(),
    };
    await axios.post("http://localhost:3000/users", userData);

    const responseLogin = await axios.post(
      "http://localhost:3000/login",
      userData
    );
    const { token } = responseLogin.data;

    expect(responseLogin.status).toBe(200);
    expect(token).toBeDefined();
  });
});

describe("Comportamentos do filme", () => {
  test("Deve criar um filme vinculado a um usuário", async () => {
    const responseCrete = await axios.post(
      "http://localhost:3000/movies",
      {
        ...movie,
        user_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { movie_id } = responseCrete.data;
    expect(movie_id).toBeDefined();
    expect(responseCrete.data.user_id).toBe(user_id);

    // busca filme criado
    const responseFilme = await axios.get(
      `http://localhost:3000/movies/${movie_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const inputFilme = responseFilme.data;

    expect(inputFilme.movie_id).toBe(movie_id);
    expect(inputFilme.movie_title).toBe(movie.movie_title);
    expect(inputFilme.user_id).toBe(user_id);
  });

  test("Não deve criar um filme com dados vazios", async () => {
    const responseCrete = await axios.post(
      "http://localhost:3000/movies",
      {
        // ...movie,
        // user_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log(responseCrete.data);
    expect(responseCrete.status).toBe(400);
  });

  test("Quando um filme é criado com data futura, o usuário recebe um email de lembrete", async () => {
    const futureDate = "2050-12-01T00:00:00Z";
    const emailSpy = jest
      .spyOn(emailService, "sendEmail")
      .mockImplementation(() => Promise.resolve());
    const response = await supertest(app)
      .post("/movies")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...movie, movie_date_lauch: futureDate });

    expect(response.status).toBe(201);
    expect(response.body.movie_id).toBeDefined();

    expect(emailSpy).toHaveBeenCalledTimes(1);
  });

  test("Não deve enviar email se a data de lançamento for passada", async () => {
    const futureDate = "2020-12-01T00:00:00Z";

    const emailSpy = jest
      .spyOn(emailService, "sendEmail")
      .mockImplementation(() => Promise.resolve());
    const response = await supertest(app)
      .post("/movies")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...movie, movie_date_lauch: futureDate });

    expect(response.status).toBe(201);
    expect(response.body.movie_id).toBeDefined();

    expect(emailSpy).toHaveBeenCalledTimes(0);
  });

  test("Deve buscar um filme especifico trazendo todos os seus dados", async () => {
    // cria usuário
    // let userData = {
    //   user_name: faker.internet.username(),
    //   user_email: faker.internet.email(),
    //   user_password: faker.internet.password(),
    // };
    // const responseUser = await axios.post(
    //   "http://localhost:3000/users",
    //   userData
    // );
    // const { user_id } = responseUser.data;

    const response = await axios.post(
      "http://localhost:3000/movies",
      {
        ...movie,
        user_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const { movie_id } = response.data;

    const responseFilme = await axios.get(
      `http://localhost:3000/movies/${movie_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const inputFilmes = responseFilme.data;
    expect(inputFilmes.movie_id).toBe(movie_id);
    expect(inputFilmes.movie_title).toBe(movie.movie_title);
  });
  test("Deve retornar 404 ao buscar um filme inexistente", async () => {
    const response = await axios.get(
      "http://localhost:3000/movies/00000000-0000-0000-0000-000000000000",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.status).toBe(404);
    expect(response.data.error).toBe("Movie not found");
  });

  test("Deve deletar um filme", async () => {
    const responseCrete = await axios.post(
      "http://localhost:3000/movies",
      {
        ...movie,
        user_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { movie_id } = responseCrete.data;
    expect(movie_id).toBeDefined();

    const responseDelete = await axios.delete(
      `http://localhost:3000/movies/${movie_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    expect(responseDelete.status).toBe(204);
  });

  test("Deve retornar 404 ao deletar um filme inexistente", async () => {
    const responseDelete = await axios.delete(
      "http://localhost:3000/movies/00000000-0000-0000-0000-000000000000",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("responseDelete", responseDelete.data);

    expect(responseDelete.status).toBe(404);
    expect(responseDelete.data.error).toBe("Filme não encontrado");
  });

  test.only("Deve listar filmes filtrando por data de lançamento, duração e popularidade", async () => {
    const response = await axios.get(
      `http://localhost:3000/movies?page=1&limit=5&movie_date_lauch_start=2020-01-01&movie_date_lauch_end=2025-12-31&movie_duration=142&movie_popularity=8.7`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = response.data;
    expect(result.page).toBe(1);
    expect(result.limit).toBe(5);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.total).toBeGreaterThan(0); // garante que existem registros

    // 🔎 Garantindo que todos respeitam os filtros
    result.data.forEach((movie: any) => {
      const movieDate = new Date(movie.movie_date_lauch);
      const startDate = new Date("2020-01-01");
      const endDate = new Date("2025-12-31");

      // Comparando somente a data
      expect(movieDate >= startDate).toBe(true);
      expect(movieDate <= endDate).toBe(true);

      // Comparação aproximada para numeric/float
      expect(movie.movie_duration).toBe(142);
      expect(Math.abs(movie.movie_popularity - 8.7)).toBeLessThan(0.01);
    });
  });

  test("Deve realizar edições em um filme", async () => {
    const responseCrete = await axios.post(
      "http://localhost:3000/movies",
      {
        ...movie,
        user_id,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const { movie_id } = responseCrete.data;
    expect(movie_id).toBeDefined();

    const updatedData = {
      movie_title: "Título Atualizado",
      movie_duration: 150,
    };
    const responseUpdate = await axios.put(
      `http://localhost:3000/movies/${movie_id}`,
      updatedData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const getFilme = await axios.get(
      `http://localhost:3000/movies/${movie_id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    const inputFilme = getFilme.data;
    expect(responseUpdate.status).toBe(200);
    expect(inputFilme.movie_title).toBe(updatedData.movie_title);
  });

  // test.only("Upload de imagem real para S3", async () => {
  //   const filePath = path.join(__dirname, "hellios.jpg"); // caminho do arquivo
  //   const form = new FormData();
  //   form.append("image", fs.createReadStream(filePath)); // passe o caminho, não o buffer

  //   const response = await axios.post(
  //     "http://localhost:3000/movies/upload",
  //     form,
  //     {
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         ...form.getHeaders(),
  //       },
  //     }
  //   );

  //   console.log("URL da imagem:", response.status);

  //   expect(response.status).toBe(200);
  // });
});
