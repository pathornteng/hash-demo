import { FileOpen, Upload } from "@mui/icons-material";
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
import { FileCreateTransaction, Hbar, FileContentsQuery } from "@hashgraph/sdk";

const FileService = (props) => {
  const [file, setFile] = useState({});
  const [fileContent, setFileContent] = useState("");
  const [showUploadButton, setShowUploadButton] = useState(false);
  const [receipt, setReceipt] = useState({});
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
      const transaction = await new FileCreateTransaction()
        .setKeys([props.client.operatorPublicKey])
        .setContents(fileContent)
        .setMaxTransactionFee(new Hbar(2))
        .freezeWith(props.client);
      //Sign with the client operator private key and submit to a Hedera network
      const submitTx = await transaction.execute(props.client);
      //Request the receipt
      const receipt = await submitTx.getReceipt(props.client);
      setReceipt(receipt);
      //Get the file ID
      const newFileId = receipt.fileId;
      console.log("The new file ID is: " + newFileId);
      setSnackbar({
        message: "Upload file success!",
        open: true,
        severity: "success",
      });
    } catch (err) {
      console.warn("File submit error", err);
      setSnackbar({
        message: "Failed to upload file " + err.toString(),
        open: true,
        severity: "error",
      });
    }
    setBackdropOpen(false);
  };

  const fetchFile = async () => {
    setBackdropOpen(true);
    try {
      const fileId = inputRef.current.value;
      const query = new FileContentsQuery().setFileId(fileId);
      //Sign with client operator private key and submit the query to a Hedera network
      const contents = await query.execute(props.client);
      setFileContent(new TextDecoder().decode(contents));
    } catch (err) {
      console.warn(err);
      setSnackbar({
        message: "Failed to fetch file " + err.toString(),
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
        <FileOpen fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>File Service</b>
      </Typography>
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Typography gutterBottom variant="h6" component="div">
            <b>Create File</b>
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={6}>
              <Button
                variant="contained"
                component="label"
                color="secondary"
                startIcon={<FileOpen />}
              >
                Select File
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
                <Typography
                  ml={2}
                  sx={{ fontSize: 16 }}
                  color="text.secondary"
                  gutterBottom
                  component="span"
                >
                  <b>FileID:</b> {receipt.fileId?.toString()}
                </Typography>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <br />
      <Card mt={5} sx={{ minWidth: 275 }}>
        <CardContent>
          <Typography gutterBottom variant="h6" component="div">
            <b>Get File</b>
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                id="FileID"
                name="FileID"
                label="Get File ID"
                fullWidth
                variant="standard"
                inputRef={inputRef}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Upload />}
                color="secondary"
                onClick={fetchFile}
              >
                Fetch File
              </Button>
            </Grid>
            <Grid item xs={12}>
              <span
                style={{
                  display: "inline-block",
                  marginRight: 0,
                  width: "800px",
                  wordWrap: "break-word",
                }}
              >
                {fileContent}
              </span>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileService;
