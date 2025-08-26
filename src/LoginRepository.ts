import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import DatabaseConnection from "./DatabaseConnection";

export interface LoginRepository {
  authenticate(user_email: string, user_password: string): Promise<string>;
}

export class LoginRepositoryDatabase implements LoginRepository {
  constructor(readonly connection: DatabaseConnection) {}

  async authenticate(
    user_email: string,
    user_password: string
  ): Promise<string> {
    const getUserQuery = `
      SELECT * FROM cubosmovie.user WHERE user_email = $1
    `;

    const user = await this.connection.oneOrNone(getUserQuery, [user_email]);

    if (!user) {
      throw new Error("Credenciais inválidas");
    }

    const passwordMatch = await bcrypt.compare(
      user_password,
      user.user_password
    );

    if (!passwordMatch) {
      throw new Error("Credenciais inválidas");
    }

    const token = jwt.sign(
      { id: user.user_id },
      process.env.JWT_SECRET as string,
      {
        expiresIn: "1h",
      }
    );

    return token;
  }
}
