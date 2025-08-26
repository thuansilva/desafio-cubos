import pg from "pg";
import pgp from "pg-promise";
import crypto from "crypto";
import DatabaseConnection from "./DatabaseConnection";
export default interface MovieRepository {
  save(movie: any, user_id: string): Promise<any>;
  getWithOneMovie(movie_id: string, user_id: string): Promise<any>;
  getAllMovie(
    user_id: string,
    filters: {
      page?: string;
      limit?: string;
      movie_date_lauch_start: string;
      movie_date_lauch_end: string;
      movie_duration: number;
      movie_popularity?: number;
    }
  ): Promise<any>;
  deleteMovie(movie_id: string, user_id: string): Promise<any>;
  updateMovie(
    movieUpdates: any,
    movie_id: string,
    user_id: string
  ): Promise<any>;
}

// 🔥 Configura parsers globais ANTES de criar conexões
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (val: any) =>
  parseFloat(val)
);
pg.types.setTypeParser(pg.types.builtins.INT8, (val: any) => parseInt(val, 10));

export class MovieRepositoryDatabase implements MovieRepository {
  constructor(readonly connection: DatabaseConnection) {}

  async save(movie: any, user_id: string): Promise<any> {
    // const connection = pgp()("postgres://postgres:123456@localhost:5432/app");

    const checkUserQuery = `SELECT user_email, user_name FROM cubosmovie.user WHERE user_id = $1`;
    const existingUser = await this.connection.oneOrNone(checkUserQuery, [
      user_id,
    ]);

    if (!existingUser) {
      throw new Error("Usuário não encontrado");
    }

    movie.movie_id = crypto.randomUUID();
    movie.user_id = user_id;

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
        RETURNING *
      `;

    let movieData = await this.connection.query(addMovieQuery, [
      movie.movie_id,
      movie.user_id,
      movie.movie_title,
      movie.movie_sinopse,
      Number(movie.movie_popularity),
      movie.movie_date_lauch,
      Number(movie.movie_duration),
      movie.movie_situation,
      movie.movie_language,
      movie.movie_genre,
      Number(movie.movie_budget),
      Number(movie.movie_revenue),
      movie.movie_description,
      movie.movie_image_url,
      movie.movie_trailer_url,
      Number(movie.movie_porcentage_like),
    ]);

    // await this.connection.close();
    return {
      ...movieData[0],
      ...existingUser,
    };
  }

  async getWithOneMovie(movie_id: string, user_id: string): Promise<any> {
    // const connection = pgp()("postgres://postgres:123456@localhost:5432/app");
    const getMovieQuery = `
    SELECT * 
    FROM cubosmovie.movie 
    WHERE movie_id = $1 AND user_id = $2
  `;

    const movie = await this.connection.oneOrNone(getMovieQuery, [
      movie_id,
      user_id,
    ]);
    // await connection.$pool.end();

    return movie;
  }

  async getAllMovie(
    user_id: string,
    filters: {
      page?: string;
      limit?: string;
      movie_date_lauch_start: string;
      movie_date_lauch_end: string;
      movie_duration: number;
      movie_popularity?: number;
    }
  ): Promise<any> {
    // const connection = pgp()("postgres://postgres:123456@localhost:5432/app");

    const {
      page = "1",
      limit = "10",
      movie_date_lauch_start,
      movie_date_lauch_end,
      movie_duration,
      movie_popularity,
    } = filters;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    const whereClauses: string[] = [`user_id = $1`];
    const queryParams: any[] = [user_id];

    // 🔎 Filtros obrigatórios com conversão de tipos
    const startDate = new Date(movie_date_lauch_start);
    const endDate = new Date(movie_date_lauch_end);
    const durationNumber = Number(movie_duration);

    queryParams.push(startDate, endDate);
    whereClauses.push(
      `movie_date_lauch BETWEEN $${queryParams.length - 1} AND $${
        queryParams.length
      }`
    );

    queryParams.push(durationNumber);
    whereClauses.push(`movie_duration = $${queryParams.length}`);

    // 🔎 Filtro opcional
    if (movie_popularity) {
      queryParams.push(Number(movie_popularity));
      whereClauses.push(`movie_popularity = $${queryParams.length}`);
    }

    // 🔎 Query de listagem com LIMIT e OFFSET corretos
    queryParams.push(limitNumber, offset);
    const getMoviesQuery = `
    SELECT * 
    FROM cubosmovie.movie 
    WHERE ${whereClauses.join(" AND ")}
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
  `;

    const movies = await this.connection.manyOrNone(
      getMoviesQuery,
      queryParams
    );

    const totalQuery = `
    SELECT COUNT(*) 
    FROM cubosmovie.movie 
    WHERE ${whereClauses.join(" AND ")}
  `;
    const totalResult = await this.connection.one(
      totalQuery,
      queryParams.slice(0, -2)
    );
    const total = parseInt(totalResult.count, 10);

    return {
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
      data: movies,
    };
  }

  async deleteMovie(movie_id: string, user_id: string): Promise<any> {
    const connection = pgp()("postgres://postgres:123456@localhost:5432/app");
    const deleteMovieQuery = `
        DELETE FROM cubosmovie.movie
        WHERE movie_id = $1 AND user_id = $2
        RETURNING *
      `;

    const result = await connection.result(deleteMovieQuery, [
      movie_id,
      user_id,
    ]);
    await connection.$pool.end();

    return result;
  }

  async updateMovie(
    movieUpdates: any,
    movie_id: string,
    user_id: string
  ): Promise<any> {
    const connection = pgp()("postgres://postgres:123456@localhost:5432/app");

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
      await connection.$pool.end();
      throw new Error("Nenhum campo válido para atualizar");
    }

    queryParams.push(movie_id, user_id);

    const updateMovieQuery = `
    UPDATE cubosmovie.movie
    SET ${setClauses.join(", ")}
    WHERE movie_id = $${queryParams.length - 1} 
      AND user_id = $${queryParams.length}
    RETURNING *
  `;

    const updatedMovie = await connection.oneOrNone(
      updateMovieQuery,
      queryParams
    );
    await connection.$pool.end();

    return updatedMovie; // retorna o filme atualizado ou null
  }
}
