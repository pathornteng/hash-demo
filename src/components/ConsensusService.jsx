import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import MirrorNodeAPI from "../api/mirror-node-api";
import { Add, Send, Topic } from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import React, { useState, useRef } from "react";

const ConsensusService = (props) => {
  const [snackbar, setSnackbar] = useState({
    message: "",
    severity: "success",
    open: false,
  });
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [topicId, setTopicId] = useState(null);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef();
  const topicIdRef = useRef();

  const subscribeTopic = async () => {
    setBackdropOpen(true);
    try {
      if (!topicIdRef.current) return;
      setTopicId(topicIdRef.current.value);
      const api = new MirrorNodeAPI();
      const response = await api.getTopicMessages(topicId.toString());
      setMessages(response.data.messages);
    } catch (err) {
      console.warn("Subscribe topic error", err);
      setSnackbar({
        message: "Failed to fetch topic messages " + err.toString(),
        severity: "error",
        open: true,
      });
    }

    setBackdropOpen(false);
  };

  const createTopic = async () => {
    setBackdropOpen(true);
    try {
      //Create the transaction
      const transaction = new TopicCreateTransaction();
      //Sign with the client operator private key and submit the transaction to a Hedera network
      const txResponse = await transaction.execute(props.client);
      //Request the receipt of the transaction
      const receipt = await txResponse.getReceipt(props.client);
      //Get the topic ID
      setTopicId(receipt.topicId);
      setSnackbar({
        message: "Create topic success " + receipt.tokenId,
        severity: "success",
        open: true,
      });
      topicIdRef.current.value = receipt.topicId?.toString();
    } catch (err) {
      console.warn("Create topic error", err);
      setSnackbar({
        message: "Failed to create topic " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const sendMessage = async () => {
    setBackdropOpen(true);
    try {
      let submitMessage = await new TopicMessageSubmitTransaction({
        topicId: topicId,
        message: inputRef.current?.value,
      }).execute(props.client);

      //Get the receipt of the transaction
      const getReceipt = await submitMessage.getReceipt(props.client);
      //Get the status of the transaction
      setSnackbar({
        message: "Send message success",
        severity: "success",
        open: true,
      });
      inputRef.current.value = "";
      const transactionStatus = getReceipt.status;
      console.log("The message transaction status" + transactionStatus);
    } catch (err) {
      console.warn("Send message error", err);
      setSnackbar({
        message: "Failed to send message " + err.toString(),
        severity: "error",
        open: true,
      });
    }
    setBackdropOpen(false);
  };

  const messageList = messages.map((msg) => {
    return (
      <ListItem alignItems="flex-start">
        <ListItemText
          primary={
            "AccountID: " +
            msg.chunk_info?.initial_transaction_id?.account_id?.toString()
          }
          secondary={
            <React.Fragment>
              <Typography
                sx={{ display: "inline" }}
                component="span"
                variant="body2"
                color="text.primary"
              >
                {new Date(
                  Math.round(msg.consensus_timestamp?.toString()) * 1000
                ).toLocaleString()}
              </Typography>{" "}
              {atob(msg.message?.toString())}
            </React.Fragment>
          }
        />
        <Divider variant="inset" component="li" />
      </ListItem>
    );
  });

  return (
    <div>
      <Typography gutterBottom variant="h5" component="div">
        <Topic fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>Consensus Service</b>
      </Typography>
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
      <Backdrop
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={backdropOpen}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={5}>
              <TextField
                id="TopicID"
                name="TopicID"
                label="Enter topic id to load messages"
                fullWidth
                variant="standard"
                inputRef={topicIdRef}
                focused
              />
            </Grid>
            <Grid item xs={7}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Topic />}
                color="secondary"
                onClick={subscribeTopic}
              >
                Fetch
              </Button>{" "}
              <Button
                variant="contained"
                component="label"
                startIcon={<Add />}
                color="secondary"
                onClick={createTopic}
              >
                Create Topic
              </Button>
            </Grid>

            <Grid item xs={5}>
              <TextField
                id="SendMessage"
                name="SendMessage"
                label="Send message to the topic"
                fullWidth
                variant="standard"
                inputRef={inputRef}
                focused
              />
            </Grid>
            <Grid item xs={7}>
              <Button
                variant="contained"
                component="label"
                startIcon={<Send />}
                color="secondary"
                onClick={sendMessage}
              >
                Send
              </Button>
            </Grid>

            <Grid item xs={12}>
              <List>{messageList}</List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConsensusService;
