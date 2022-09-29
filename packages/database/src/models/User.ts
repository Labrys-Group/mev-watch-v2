import { getModelForClass, prop } from "@typegoose/typegoose";

class UserClass {
  @prop()
  public name?: string;
}

const UserModel = getModelForClass(UserClass);

export { UserClass, UserModel };
