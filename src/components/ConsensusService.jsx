import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";
import { Add, Send, Topic, Stop, FiberManualRecord, ContentCopy } from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useState, useRef, useEffect } from "react";
import MirrorNodeAPI from "../api/mirror-node-api";

const POLL_INTERVAL_MS = 3000;

const ConsensusService = (props) => {
  const [snackbar, setSnackbar] = useState({ message: "", severity: "success", open: false });
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef();
  const topicIdRef = useRef();
  const pollIntervalRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const feedBottomRef = useRef();

  useEffect(() => {
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startPolling = (id) => {
    const api = new MirrorNodeAPI();

    const poll = async () => {
      try {
        const resp = await api.getTopicMessages(id, lastTimestampRef.current);
        const newMessages = resp.data?.messages ?? [];
        if (newMessages.length > 0) {
          lastTimestampRef.current = newMessages[newMessages.length - 1].consensus_timestamp;
          setMessages((prev) => [
            ...prev,
            ...newMessages.map((msg) => ({
              seqNum: msg.sequence_number,
              text: atob(msg.message),
              ts: new Date(Math.round(Number(msg.consensus_timestamp)) * 1000),
              payer: msg.payer_account_id,
            })),
          ]);
        }
      } catch (err) {
        setSnackbar({ message: "Polling error: " + err.toString(), severity: "error", open: true });
        stopPolling();
        setSubscribed(false);
      }
    };

    poll();
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
  };

  const subscribe = () => {
    const id = topicIdRef.current?.value?.trim();
    if (!id) return;
    stopPolling();
    setMessages([]);
    lastTimestampRef.current = null;
    setTopicId(id);
    setSubscribed(true);
    startPolling(id);
    setSnackbar({ message: `Subscribed to ${id}`, severity: "success", open: true });
  };

  const unsubscribe = () => {
    stopPolling();
    setSubscribed(false);
    setSnackbar({ message: "Unsubscribed", severity: "info", open: true });
  };

  const createTopic = async () => {
    setBackdropOpen(true);
    try {
      const txResponse = await new TopicCreateTransaction().execute(props.client);
      const receipt = await txResponse.getReceipt(props.client);
      const newTopicId = receipt.topicId?.toString();
      topicIdRef.current.value = newTopicId;
      setSnackbar({ message: "Topic created: " + newTopicId, severity: "success", open: true });
    } catch (err) {
      setSnackbar({ message: "Failed to create topic: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const sendMessage = async () => {
    const msg = inputRef.current?.value?.trim();
    if (!msg) return;
    setBackdropOpen(true);
    try {
      const txResponse = await new TopicMessageSubmitTransaction({
        topicId,
        message: msg,
      }).execute(props.client);
      await txResponse.getReceipt(props.client);
      inputRef.current.value = "";
    } catch (err) {
      setSnackbar({ message: "Failed to send message: " + err.toString(), severity: "error", open: true });
    }
    setBackdropOpen(false);
  };

  const handleMessageKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSnackbar({ message: "Copied to clipboard", severity: "success", open: true });
  };

  return (
    <div>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={backdropOpen}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={3000}
        open={snackbar.open}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Page header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Topic fontSize="small" />
          <Typography variant="h5" fontWeight={700}>Consensus Service</Typography>
        </Box>
        {subscribed && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FiberManualRecord sx={{ fontSize: 10, color: "#4caf50" }} />
            <Typography variant="caption" color="text.secondary">
              Live · polling every {POLL_INTERVAL_MS / 1000}s
            </Typography>
          </Box>
        )}
      </Box>

      {/* Two-column layout on larger screens */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1.6fr" }, gap: 2, alignItems: "start" }}>

        {/* Left column: topic + compose */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* Topic card */}
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Topic</Typography>

              <TextField
                variant="outlined"
                size="small"
                fullWidth
                inputRef={topicIdRef}
                placeholder="e.g. 0.0.12345"
                disabled={subscribed}
                sx={{ mb: 1.5 }}
              />

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {!subscribed ? (
                  <Button
                    variant="contained"
                    color="info"
                    startIcon={<Topic />}
                    onClick={subscribe}
                    fullWidth
                    sx={{ textTransform: "none" }}
                  >
                    Subscribe
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Stop />}
                    onClick={unsubscribe}
                    fullWidth
                    sx={{ textTransform: "none" }}
                  >
                    Unsubscribe
                  </Button>
                )}
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={createTopic}
                  fullWidth
                  sx={{ textTransform: "none" }}
                >
                  Create New Topic
                </Button>
              </Box>

              {subscribed && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: "#f0fff4",
                    border: "1px solid #c6f6d5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block" }}>
                      Active Topic
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                      <a
                        href={`https://hashscan.io/testnet/topic/${topicId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2e7d32" }}
                      >
                        {topicId}
                      </a>
                    </Typography>
                  </Box>
                  <Tooltip title="Copy topic ID">
                    <IconButton size="small" onClick={() => copyToClipboard(topicId)}>
                      <ContentCopy sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Compose card */}
          <Card
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: subscribed ? "divider" : "divider",
              opacity: subscribed ? 1 : 0.55,
              transition: "opacity 0.2s",
            }}
          >
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Submit Message
              </Typography>
              <TextField
                label="Message"
                variant="outlined"
                size="small"
                multiline
                rows={3}
                fullWidth
                inputRef={inputRef}
                onKeyDown={handleMessageKeyDown}
                disabled={!subscribed}
                placeholder={subscribed ? "Type a message… (Shift+Enter for newline, Enter to send)" : "Subscribe to a topic first"}
                sx={{ mb: 1.5 }}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={sendMessage}
                disabled={!subscribed}
                fullWidth
                sx={{ textTransform: "none" }}
              >
                Send Message
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Right column: feed */}
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#fafafa",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>Message Feed</Typography>
              {messages.length > 0 && (
                <Chip
                  label={messages.length}
                  size="small"
                  sx={{ height: 18, fontSize: "0.7rem", backgroundColor: "#f0f2ff", color: "#5D6DD8" }}
                />
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {subscribed && (
                <CircularProgress size={12} thickness={5} sx={{ color: "#4caf50" }} />
              )}
              {messages.length > 0 && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setMessages([])}
                  sx={{ textTransform: "none", fontSize: "0.75rem", minWidth: 0, p: "2px 6px" }}
                >
                  Clear
                </Button>
              )}
            </Box>
          </Box>

          <Box
            sx={{
              height: 480,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {messages.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1.5,
                  color: "text.disabled",
                  p: 3,
                }}
              >
                <Topic sx={{ fontSize: 40, opacity: 0.2 }} />
                <Typography variant="body2" textAlign="center">
                  {subscribed
                    ? "Waiting for messages on " + topicId + "…"
                    : "Subscribe to a topic to see messages here"}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                {messages.map((msg) => (
                  <Box
                    key={msg.seqNum}
                    sx={{
                      p: 1.5,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 1.5,
                      backgroundColor: "#fff",
                      "&:hover": { borderColor: "#5D6DD8", backgroundColor: "#f8f9ff" },
                      transition: "all 0.15s",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <a
                          href={`https://hashscan.io/testnet/topic/${topicId}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ textDecoration: "none" }}
                        >
                          <Chip
                            label={`#${msg.seqNum}`}
                            size="small"
                            clickable
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              fontFamily: "monospace",
                              backgroundColor: "#f0f2ff",
                              color: "#5D6DD8",
                              fontWeight: 600,
                            }}
                          />
                        </a>
                        {msg.payer && (
                          <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}>
                            <a
                              href={`https://hashscan.io/testnet/account/${msg.payer}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {msg.payer}
                            </a>
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                        {msg.ts.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ wordBreak: "break-word", lineHeight: 1.6 }}
                    >
                      {msg.text}
                    </Typography>
                  </Box>
                ))}
                <div ref={feedBottomRef} />
              </Box>
            )}
          </Box>
        </Card>

      </Box>
    </div>
  );
};

export default ConsensusService;
