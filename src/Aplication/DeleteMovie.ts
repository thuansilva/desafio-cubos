import MovieRepository from "../Infra/Repository/MovieRepository";

export default class DeleteMovie {
  constructor(readonly movieRepository: MovieRepository) {}

  async executeDelete(movie_id: string, user_id: string): Promise<any> {
    const movie = await this.movieRepository.deleteMovie(movie_id, user_id);

    if (movie.rowCount === 0) {
      throw new Error("Filme não encontrado");
    }
  }
}
