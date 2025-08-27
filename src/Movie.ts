export default class Movie {
  constructor(
    readonly movie_id: string,
    readonly user_id: string,
    readonly movie_title: string,
    readonly movie_sinopse: string,
    readonly movie_popularity: number,
    readonly movie_date_lauch: Date, // ISO Date string
    readonly movie_duration: number, // minutos
    readonly movie_situation: string,
    readonly movie_language: string,
    readonly movie_genre: string[],
    readonly movie_budget: number, // dólares
    readonly movie_revenue: number, // dólares
    readonly movie_description: string,
    readonly movie_image_url: string,
    readonly movie_trailer_url: string,
    readonly movie_porcentage_like: number
  ) {}

  async validate(movie: MovieInput) {
    const requiredFields: (keyof MovieInput)[] = [
      "movie_date_lauch",
      "movie_duration",
    ];
    const missingFields = requiredFields.filter((field) => !movie[field]);
    if (missingFields.length > 0) {
      throw new Error("Campos obrigatórios faltando");
    }
  }
}

type MovieInput = {
  movie_id: string;
  movie_title: string;
  movie_sinopse: string;
  movie_popularity: number;
  movie_date_lauch: Date; // ISO Date string
  movie_duration: number; // minutos
  movie_situation: string;
  movie_language: string;
  movie_genre: string[];
  movie_budget: number; // dólares
  movie_revenue: number; // dólares
  movie_description: string;
  movie_image_url: string;
  movie_trailer_url: string;
  movie_porcentage_like: number;
};
