import { FileOpen, Upload, Download, ContentCopy, InsertDriveFile, Search } from "@mui/icons-material";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useState, useRef } from "react";
import { FileCreateTransaction, Hbar, FileContentsQuery } from "@hashgraph/sdk";

const DEMO_TEXT = `Hello from Hedera File Service!

This file was created and stored on the Hedera network.
Consensus timestamp proves exactly when this content existed.

Key properties:
- Immutable once created
- Content-addressable by File ID
- Stored across the Hedera network nodes
- Max ~1 KB per transaction

Hedera File Service is ideal for storing small documents,
configuration files, smart contract bytecode, and legal records
that require an auditable, tamper-proof history.`;

const FileService = (props) => {
  const [tab, setTab] = useState(0); // 0 = text editor, 1 = file upload
  const [demoText, setDemoText] = useState(DEMO_TEXT);
  const [file, setFile] = useState(null);
  const [uploadedFileId, setUploadedFileId] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [fetchedFileId, setFetchedFileId] = useState("");
  const [snackbar, setSnackbar] = useState({ message: "", severity: "success", open: false });
  const [backdropOpen, setBackdropOpen] = useState(false);
  const fileInputRef = useRef();
  const fetchIdRef = useRef();

  const showSnack = (message, severity = "success") =>
    setSnackbar({ message, severity, open: true });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnack("Copied to clipboard");
  };

  const onFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const readLocalFile = () =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsText(file);
    });

  const uploadContent = async (content) => {
    const transaction = await new FileCreateTransaction()
      .setKeys([props.client.operatorPublicKey])
      .setContents(content)
      .setMaxTransactionFee(new Hbar(2))
      .freezeWith(props.client);
    const submitTx = await transaction.execute(props.client);
    const receipt = await submitTx.getReceipt(props.client);
    return receipt.fileId?.toString();
  };

  const handleUploadText = async () => {
    if (!demoText.trim()) return;
    setBackdropOpen(true);
    try {
      const fileId = await uploadContent(demoText);
      setUploadedFileId(fileId);
      showSnack("File uploaded successfully! File ID: " + fileId);
    } catch (err) {
      showSnack("Failed to upload: " + err.toString(), "error");
    }
    setBackdropOpen(false);
  };

  const handleUploadFile = async () => {
    if (!file) return;
    setBackdropOpen(true);
    try {
      const content = await readLocalFile();
      const fileId = await uploadContent(content);
      setUploadedFileId(fileId);
      showSnack("File uploaded successfully! File ID: " + fileId);
    } catch (err) {
      showSnack("Failed to upload: " + err.toString(), "error");
    }
    setBackdropOpen(false);
  };

  const fetchFile = async () => {
    const fileId = fetchIdRef.current?.value?.trim();
    if (!fileId) return;
    setBackdropOpen(true);
    try {
      const query = new FileContentsQuery().setFileId(fileId);
      const contents = await query.execute(props.client);
      const text = new TextDecoder().decode(contents);
      setFileContent(text);
      setFetchedFileId(fileId);
    } catch (err) {
      showSnack("Failed to fetch file: " + err.toString(), "error");
    }
    setBackdropOpen(false);
  };

  const downloadContent = (text, filename) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <InsertDriveFile fontSize="small" />
        <Typography variant="h5" fontWeight={700}>File Service</Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>

        {/* Left — Create & Upload */}
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <Box sx={{ px: 2, pt: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Create File</Typography>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{ minHeight: 36, mb: 2, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontSize: "0.82rem" } }}
            >
              <Tab label="Text Editor" />
              <Tab label="Upload from disk" />
            </Tabs>
          </Box>

          <CardContent sx={{ pt: 0 }}>
            {tab === 0 ? (
              <>
                <TextField
                  multiline
                  rows={12}
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={demoText}
                  onChange={(e) => setDemoText(e.target.value)}
                  inputProps={{ style: { fontFamily: "monospace", fontSize: "0.8rem", lineHeight: 1.6 } }}
                  sx={{ mb: 1.5 }}
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<Upload />}
                    onClick={handleUploadText}
                    disabled={!demoText.trim()}
                    sx={{ textTransform: "none", flex: 1 }}
                  >
                    Upload to Hedera
                  </Button>
                  <Tooltip title="Reset to demo text">
                    <Button
                      variant="outlined"
                      onClick={() => setDemoText(DEMO_TEXT)}
                      sx={{ textTransform: "none", whiteSpace: "nowrap" }}
                    >
                      Reset
                    </Button>
                  </Tooltip>
                </Box>
              </>
            ) : (
              <>
                <Box
                  sx={{
                    border: "2px dashed",
                    borderColor: file ? "primary.main" : "divider",
                    borderRadius: 1,
                    p: 3,
                    textAlign: "center",
                    mb: 1.5,
                    cursor: "pointer",
                    backgroundColor: file ? "#f8f9ff" : "#fafafa",
                    transition: "all 0.15s",
                    "&:hover": { borderColor: "primary.main", backgroundColor: "#f8f9ff" },
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" hidden onChange={onFileChange} />
                  <FileOpen sx={{ fontSize: 32, color: file ? "#5D6DD8" : "text.disabled", mb: 1 }} />
                  {file ? (
                    <>
                      <Typography variant="body2" fontWeight={600}>{file.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(file.size / 1024).toFixed(1)} KB · click to change
                      </Typography>
                    </>
                  ) : (
                    <>
                      <Typography variant="body2" color="text.secondary">Click to select a file</Typography>
                      <Typography variant="caption" color="text.disabled">Text files recommended · max ~1 KB</Typography>
                    </>
                  )}
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Upload />}
                  onClick={handleUploadFile}
                  disabled={!file}
                  fullWidth
                  sx={{ textTransform: "none" }}
                >
                  Upload to Hedera
                </Button>
              </>
            )}

            {/* Upload result */}
            {uploadedFileId && (
              <>
                <Divider sx={{ my: 2 }} />
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    backgroundColor: "#f0fff4",
                    border: "1px solid #c6f6d5",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5, display: "block", mb: 0.5 }}>
                    Uploaded — File ID
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700, color: "#2e7d32", flex: 1 }}>
                      <a
                        href={`https://hashscan.io/testnet/file/${uploadedFileId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "#2e7d32" }}
                      >
                        {uploadedFileId}
                      </a>
                    </Typography>
                    <Tooltip title="Copy File ID">
                      <IconButton size="small" onClick={() => copyToClipboard(uploadedFileId)}>
                        <ContentCopy sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    color="info"
                    sx={{ textTransform: "none", mt: 0.5, p: 0, fontSize: "0.75rem" }}
                    onClick={() => {
                      fetchIdRef.current.value = uploadedFileId;
                    }}
                  >
                    → Load in viewer
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right — Fetch & View */}
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Get File</Typography>

            <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
              <TextField
                label="File ID"
                variant="outlined"
                size="small"
                inputRef={fetchIdRef}
                placeholder="e.g. 0.0.12345"
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                color="info"
                startIcon={<Search />}
                onClick={fetchFile}
                sx={{ textTransform: "none", whiteSpace: "nowrap" }}
              >
                Fetch
              </Button>
            </Box>

            {fileContent ? (
              <>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      label={fetchedFileId}
                      size="small"
                      component="a"
                      href={`https://hashscan.io/testnet/file/${fetchedFileId}`}
                      target="_blank"
                      rel="noreferrer"
                      clickable
                      sx={{ fontFamily: "monospace", fontSize: "0.72rem", backgroundColor: "#f0f2ff", color: "#5D6DD8" }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {fileContent.length} chars
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    <Tooltip title="Copy content">
                      <IconButton size="small" onClick={() => copyToClipboard(fileContent)}>
                        <ContentCopy sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download as .txt">
                      <IconButton
                        size="small"
                        onClick={() => downloadContent(fileContent, `${fetchedFileId}.txt`)}
                      >
                        <Download sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box
                  sx={{
                    p: 2,
                    backgroundColor: "#fafafa",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                    lineHeight: 1.7,
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                    maxHeight: 380,
                    overflowY: "auto",
                  }}
                >
                  {fileContent}
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  py: 8,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                  color: "text.disabled",
                }}
              >
                <InsertDriveFile sx={{ fontSize: 40, opacity: 0.2 }} />
                <Typography variant="body2">Enter a File ID and press Fetch</Typography>
              </Box>
            )}
          </CardContent>
        </Card>

      </Box>
    </div>
  );
};

export default FileService;
