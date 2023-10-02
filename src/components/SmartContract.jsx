import { Code, Edit, FileOpen, QueryStats, Upload } from "@mui/icons-material";
import {
  Backdrop,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Snackbar,
  Alert,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import { useState, useRef } from "react";
import {
  FileCreateTransaction,
  Hbar,
  ContractCreateTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  ContractExecuteTransaction,
} from "@hashgraph/sdk";

const SmartContract = (props) => {
  const [file, setFile] = useState({});
  const [showUploadButton, setShowUploadButton] = useState(false);
  const [receipt, setReceipt] = useState({});
  const [contract, setContract] = useState({});
  const [queryResult, setQueryResult] = useState();
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });
  const [backdropOpen, setBackdropOpen] = useState(false);
  const inputRef = useRef();

  const onFileChange = (e) => {
    setFile(e.target.files[0]);
    setShowUploadButton(true);
  };

  const contractTx = async () => {
    setBackdropOpen(true);
    try {
      const contractExecuteTx = new ContractExecuteTransaction()
        .setContractId(contract.contractId)
        .setGas(100000)
        .setFunction(
          "store",
          new ContractFunctionParameters().addUint256(
            parseInt(inputRef.current?.value)
          )
        )
        .setMaxTransactionFee(new Hbar(1));
      const contractExecuteSubmit = await contractExecuteTx.execute(
        props.client
      );
      const contractExecuteRx = await contractExecuteSubmit.getReceipt(
        props.client
      );
      console.log(
        `- Contract function call status: ${contractExecuteRx.status} \n`
      );
      setSnackbar({
        message: "Called contract successfully",
        severity: "success",
        open: true,
      });
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to call the contract " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const contractCall = async () => {
    setBackdropOpen(true);
    try {
      const contractQueryTx = new ContractCallQuery()
        .setContractId(contract.contractId)
        .setGas(100000)
        .setFunction("retrieve")
        .setMaxQueryPayment(new Hbar(1));
      const transactionResult = await contractQueryTx.execute(props.client);
      const contractQueryResult = transactionResult.getUint256(0);
      setQueryResult(contractQueryResult);
      setSnackbar({
        message: "Called the contract successfully",
        open: true,
        severity: "success",
      });
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to call the contract " + err.toString(),
        open: true,
        severity: "error",
      });
    }
    setBackdropOpen(false);
  };

  const readFile = async () => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target.result);
      };
      reader.readAsText(file);
    });
  };

  const fileSubmit = async () => {
    setBackdropOpen(true);
    try {
      const fileContent = await readFile();
      console.log("FileContent", fileContent);

      const transaction = await new FileCreateTransaction()
        .setKeys([props.client.operatorPublicKey]) //A different key then the client operator key
        .setContents(fileContent)
        .setMaxTransactionFee(new Hbar(2))
        .freezeWith(props.client);
      //Sign with the client operator private key and submit to a Hedera network
      const submitTx = await transaction.execute(props.client);

      //Request the receipt
      const receipt = await submitTx.getReceipt(props.client);
      setReceipt(receipt);
      console.log(receipt);

      //Get the file ID
      const smartContractFileID = receipt.fileId;

      const contractInstantiateTx = new ContractCreateTransaction()
        .setBytecodeFileId(smartContractFileID)
        .setGas(100000)
        .setConstructorParameters();
      const contractInstantiateSubmit = await contractInstantiateTx.execute(
        props.client
      );
      const contractInstantiateRx = await contractInstantiateSubmit.getReceipt(
        props.client
      );
      const contractId = contractInstantiateRx.contractId;
      const contractAddress = contractId.toSolidityAddress();
      console.log(`- The smart contract ID is: ${contractId} \n`);
      console.log(
        `- Smart contract ID in Solidity format: ${contractAddress} \n`
      );
      setContract({
        contractId: contractId,
        contractAddress: contractAddress,
      });
      setSnackbar({
        message: "Uploaded and deployed the contract successfully!",
        open: true,
        severity: "success",
      });
    } catch (err) {
      console.warn("File submit error", err);
      setSnackbar({
        message: "Failed to upload and deploy the contract " + err.toString(),
        open: true,
        severity: "error",
      });
    }
    setBackdropOpen(false);
  };

  return (
    <div>
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={backdropOpen}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        autoHideDuration={3000}
        open={snackbar.open}
        severity={snackbar.severity}
        onClose={() =>
          setSnackbar({
            open: false,
            message: snackbar.message,
            severity: snackbar.severity,
          })
        }
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Typography gutterBottom variant="h5" component="div">
        <Code fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>Smart Contract</b>
      </Typography>
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Typography gutterBottom variant="h6" component="div">
            <b>Upload Smart Contract Bytecode</b>
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                color="secondary"
                startIcon={<FileOpen />}
              >
                Select bytecode
                <input type="file" hidden onChange={onFileChange} />
              </Button>{" "}
              <b style={{ margin: "5px" }}>{file.name}</b>{" "}
              {showUploadButton && (
                <IconButton
                  visible={showUploadButton.toString()}
                  color="info"
                  onClick={fileSubmit}
                >
                  <Upload />
                </IconButton>
              )}
            </Grid>

            <Grid item xs={12}>
              {receipt.fileId != null && (
                <div>
                  <b>FileID:</b> {receipt.fileId?.toString()}
                </div>
              )}
              {contract.contractId != null && (
                <div>
                  <div>
                    <b>ContractId:</b> {contract.contractId?.toString()}
                  </div>
                  <div>
                    <b>ContractAddress:</b>{" "}
                    {contract.contractAddress?.toString()}
                  </div>
                </div>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <br />
      <Card mt={5} sx={{ minWidth: 275 }}>
        <CardContent>
          <Typography gutterBottom variant="h6" component="div">
            <b>Call Smart Contract</b>
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={3}>
              <TextField
                id="Number"
                name="Number"
                label="Store a number"
                fullWidth
                variant="standard"
                inputRef={inputRef}
              />
            </Grid>
            <Grid item xs={9}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Edit />}
                color="secondary"
                onClick={contractTx}
              >
                Set
              </Button>{" "}
              <Button
                variant="contained"
                component="label"
                startIcon={<QueryStats />}
                color="secondary"
                onClick={contractCall}
              >
                Get
              </Button>
            </Grid>
            <Grid item xs={12}>
              {queryResult && (
                <div> The number is {queryResult.toString()}</div>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartContract;
