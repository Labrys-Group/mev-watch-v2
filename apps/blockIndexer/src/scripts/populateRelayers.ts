import { RELAYERS } from "consts";
import { connect, RelayerModel } from "database";

const readFromConsts = async () => {
  await connect();

  console.log("Updating relayer data");

  await RelayerModel.create(RELAYERS);

  console.log("Finished!");
};

readFromConsts();
