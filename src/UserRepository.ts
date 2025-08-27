import bcrypt from "bcrypt";
import crypto from "crypto";
import DatabaseConnection from "./DatabaseConnection";

export interface UserRepository {
  save(
    user_email: string,
    user_password: string,
    user_name: string
  ): Promise<{ user_id: number; user_email: string; user_name: string }>;
}

export class UserRepositoryDatabase implements UserRepository {
  constructor(readonly connection: DatabaseConnection) {}

  async save(
    user_email: string,
    user_password: string,
    user_name: string
  ): Promise<{ user_id: number; user_email: string; user_name: string }> {
    const checkEmailQuery = `
      SELECT * FROM cubosmovie.user WHERE user_email = $1
    `;

    const existingUser = await this.connection.oneOrNone(checkEmailQuery, [
      user_email,
    ]);

    if (existingUser) {
      throw new Error("Email já cadastrado");
    }

    const hashedPassword = await bcrypt.hash(user_password, 10);
    const userId = crypto.randomBytes(16).toString("hex");

    const insertUserQuery = `
      INSERT INTO cubosmovie.user (user_id, user_email, user_password, user_name)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, user_email, user_name
    `;

    const newUser = await this.connection.one(insertUserQuery, [
      userId,
      user_email,
      hashedPassword,
      user_name,
    ]);

    return newUser;
  }
}
