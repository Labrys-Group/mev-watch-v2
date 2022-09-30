import axios from "axios";
import { uniqBy } from "lodash";

const main = async () => {
  const { data } = await axios.get(
    "https://boost-relay.flashbots.net/relay/v1/data/bidtraces/proposer_payload_delivered"
  );

  const unique = uniqBy(data, (field: any) => field.proposer_fee_recipient);

  unique.forEach((item) => console.log(item.proposer_fee_recipient));
};

main();
