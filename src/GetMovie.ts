import MovieRepository from "./MovieRepository";

export default class GetMovie {
  constructor(readonly movieRepository: MovieRepository) {}

  async GetOneMovie(movie_id: string, user_id: string): Promise<any> {
    const movie = await this.movieRepository.getWithOneMovie(movie_id, user_id);
    if (!movie) {
      throw new Error("Movie not found");
    }
    return movie;
  }
  async GetAllMovie(
    queryParams: MovieQueryParams,
    user_id: string
  ): Promise<any> {
    if (
      !queryParams.movie_date_lauch_start ||
      !queryParams.movie_date_lauch_end ||
      !queryParams.movie_duration
    ) {
      throw new Error(
        "Filtros obrigatórios faltando. É necessário informar movie_date_lauch_start, movie_date_lauch_end e movie_duration"
      );
    }

    const result = await this.movieRepository.getAllMovie(user_id, queryParams);
    return result;
  }
}

export type MovieQueryParams = {
  page: string;
  limit: string;
  movie_date_lauch_start: string;
  movie_date_lauch_end: string;
  movie_duration: number;
  movie_popularity: number;
};
