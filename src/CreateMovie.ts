import { sendEmail } from "./emailService";
import { LoginRepository } from "./LoginRepository";
import Movie from "./Movie";
import MovieRepository from "./MovieRepository";

export default class CreateMovie {
  constructor(
    readonly movieRepository: MovieRepository,
    readonly loginRepository: LoginRepository
  ) {}

  async execute(movie: MovieInput, user_id: string): Promise<any> {
    const movieId = crypto.randomUUID();
    const movieUsecase = new Movie(
      movieId,
      user_id,
      movie.movie_title,
      movie.movie_sinopse,
      movie.movie_popularity,
      new Date(movie.movie_date_lauch),
      movie.movie_duration,
      movie.movie_situation,
      movie.movie_language,
      movie.movie_genre,
      movie.movie_budget,
      movie.movie_revenue,
      movie.movie_description,
      movie.movie_image_url,
      movie.movie_trailer_url,
      movie.movie_porcentage_like
    );

    await movieUsecase.validate(movieUsecase);
    const result = await this.movieRepository.save(movieUsecase, user_id);

    return result;
  }

  async sendEmailAlert(movie: movieAlert, userId: string) {
    const launchDate = new Date(movie.movie_date_lauch);
    const nowDate = new Date();
    const isFuture = launchDate > nowDate;

    const { user_email } = await this.loginRepository.getUser(userId);

    if (isFuture) {
      try {
        await sendEmail(
          user_email,
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

type movieAlert = {
  movie_title: string;
  movie_date_lauch: Date; // ISO Date string
};
