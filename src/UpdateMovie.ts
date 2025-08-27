import Movie from "./Movie";
import MovieRepository from "./MovieRepository";

export default class UpdateMovie {
  constructor(readonly movieRepository: MovieRepository) {}

  async update(
    movie: MovieInput,
    movie_id: string,
    user_id: string
  ): Promise<any> {
    const updatedMovie = await this.movieRepository.updateMovie(
      movie,
      movie_id,
      user_id
    );
    if (!updatedMovie) {
      throw new Error("Filme não encontrado");
    }
    return updatedMovie;
  }
}

type MovieInput = {
  movie_title: string;
  movie_sinopse: string;
  movie_popularity: number;
  movie_date_lauch: Date;
  movie_duration: number;
  movie_situation: string;
  movie_language: string;
  movie_genre: string[];
  movie_budget: number;
  movie_revenue: number;
  movie_description: string;
  movie_image_url: string;
  movie_trailer_url: string;
  movie_porcentage_like: number;
};
