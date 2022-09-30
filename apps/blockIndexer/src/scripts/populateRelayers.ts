import { relayerData } from "consts";
import { connect, RelayerModel } from "database";

const readFromConsts = async () => {
  await connect();

  console.log("Updating relayer data");

  await RelayerModel.create(relayerData);

  console.log("Finished!");
};

readFromConsts();
