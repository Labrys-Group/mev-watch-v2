// import axios from "axios";
// import parse from "node-html-parser";

// const failedScrape = async () => {
//   const { data: mevBoostWebpage } = await axios.get(
//     "https://etherscan.io/accounts/label/mev-builder"
//   );
//   const root = parse(mevBoostWebpage);

//   const table = root.querySelector(".table");

//   // const foundValidTable = table?.childNodes.filter(node)
//   // TODO: I realised this request returns the data behind a paywall, leaving for now and coming back later
//   table?.childNodes.filter((node) => console.log(node));
// };
import { relayerData } from "consts";
import { connect, RelayerModel } from "database";

const readFromConsts = async () => {
  await connect();

  console.log("Updating relayer data");

  await RelayerModel.create(relayerData);

  console.log("Finished!");
};

readFromConsts();
