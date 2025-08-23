import axios from "axios";
import { expect, test } from "@jest/globals";

const movie = {
  // movie_id: "550e8400-e29b-41d4-a716-446655440000",
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
  // movie_created_at: new Date(),
  // movie_updated_at: new Date(),
};

test("Deve criar um filme", async () => {
  const responseCrete = await axios.post("http://localhost:3000/movies", movie);
  const inputCreateFilme = responseCrete.data;
  expect(inputCreateFilme.movie_id).toBeDefined();
});
