const express = require("express");
const https = require("https");
const fs = require("fs");
const app = express();
const router = express.Router();
const cors = require("cors");
const { pilotParams } = require("./config");
const { generateUrlParams } = require("./utils");
const axios = require("axios");

// Define the paths to your certificate files

const privateKey = fs.readFileSync(
  `${__dirname}/_grupoavant_com_do.key`,
  "utf8",
);
const certificate = fs.readFileSync(
  `${__dirname}/_grupoavant_com_do.crt`,
  "utf8",
);
// Optional: Include a certificate authority chain file if your CA provides one
// const ca = fs.readFileSync('path/to/your/ca.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  // ca: ca // Uncomment this line if you use a CA chain file
};

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(router);

router.post("/", async (req, res) => {
  leads = [req.body].map((item) => ({ gitId: crypto.randomUUID(), ...item }));

  console.log(leads);

  postData(leads);

  res.send({ message: "Hello, HTTPS world!" });
});

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(process.env.CRM_MIDDLEWARE_PORT || 3001, () => {
  console.log(
    `HTTPS Server running on port ${process.env.CRM_MIDDLEWARE_PORT || 3001}`,
  );
});

async function postData(leads) {
  const pilotUrl = "https://api.pilotsolution.net/webhooks/welcome.php";
  console.log(`Uploading leads...`);
  const processedLeads = {
    success: [],
    error: [],
  };
  for (let l of leads) {
    let params = {
      ...pilotParams,
      pilot_business_type_id: l.businessTypeCodeId,
      pilot_business_type_code: l.businessTypeCode, //Marca
      pilot_suborigin_id: l.suboriginId, // Origen de datos PILOT,
      pilot_firstname: l.firstname,
      pilot_lastname: l.lastname,
      pilot_email: l.email,
      pilot_cellphone: l.cellphone,
      pilot_notes: l.comments || "",
      pilot_notificacions_opt_in_consent_flag: l.consent,
      pilot_product_of_interest: l.productOfInterest,
    };

    let url = `${pilotUrl}${generateUrlParams(params)}`;

    try {
      await axios.post(url);
      console.log("Lead uploaded! --> ", l);

      processedLeads.success.push(l);
    } catch (error) {
      console.log(`Error on lead ${l.gitId}`);
      console.log(error);
      processedLeads.error.push(l);
    }
  }

  return processedLeads;
}

async function init(leadInfo) {
  //Posting
  const date = new Date().toISOString().split("T")[0];
  const filename = `leads-${date}.json`;

  if (leadInfo.lenght == 0) {
    throw new Error("Not data was fetched");
  }

  //Validate if file doesn't exists
  if (!fs.existsSync(`${__dirname}/data/${filename}`)) {
    await createJsonFile(filename, leadInfo);
    postData(leadInfo);
  } else {
    //validate if there are some new leads
    const { localLeads, newLeads } = await validateNewLeads(leadInfo, filename);

    if (newLeads?.length > 0) {
      console.log(`New leads fetched...[${newLeads.length}]`);
      console.log("Preparing to post the new leads...");
      const { success, error } = await postData(newLeads);
      console.log("Local Database is up to date!");
      await createJsonFile(filename, [...localLeads, ...success]);
      if (error.length > 0) console.log("Leads not uploaded due to errors");
      console.log(error.map((l) => l.gitId).join("\n"));
    } else {
      console.log("Local Database is up to date!");
      console.log("No new leads where found. Nothing to update.");
    }
  }
}
