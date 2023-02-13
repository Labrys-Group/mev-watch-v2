import { RELAYERS } from "consts";
import { connect, RelayerModel } from "database/dist";

const readFromConsts = async () => {
  await connect();

  console.log("Updating relayer data");

  await RelayerModel.create(RELAYERS);

  console.log("Finished!");

  process.exit(0);
};

readFromConsts();
