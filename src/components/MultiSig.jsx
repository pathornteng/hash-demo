import React, { useState, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  Stepper,
  Step,
  StepLabel,
  Slider,
  LinearProgress,
  Backdrop,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Link,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { Lock as LockPerson } from "@mui/icons-material";
import {
  PrivateKey,
  AccountCreateTransaction,
  TransferTransaction,
  Hbar,
  KeyList,
} from "@hashgraph/sdk";

const STEPS = ["Configure Keys", "Create Account", "Build Transaction", "Sign & Execute"];

const PRIMARY = "#070414";
const ACCENT = "#5D6DD8";

const cardStyle = {
  elevation: 0,
  sx: {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 2,
  },
};

const btnStyle = { textTransform: "none" };

const labelUppercase = {
  variant: "caption",
  sx: { textTransform: "uppercase", letterSpacing: 1, color: "text.secondary", fontWeight: 600 },
};

function truncateKey(hex) {
  if (!hex || hex.length <= 24) return hex;
  return hex.slice(0, 16) + "…" + hex.slice(-8);
}

const MultiSig = (props) => {
  const { client, account } = props;

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snackOpen, setSnackOpen] = useState(false);

  // Step 0
  const [numSigners, setNumSigners] = useState(3);
  const [threshold, setThreshold] = useState(2);
  const [keys, setKeys] = useState([]);

  // Step 1
  const [initialBalance, setInitialBalance] = useState("5");
  const [multisigAccountId, setMultisigAccountId] = useState("");

  // Step 2
  const recipientRef = useRef();
  const amountRef = useRef();
  const [txSummary, setTxSummary] = useState(null);

  // Step 3
  const frozenTxRef = useRef(null);
  const [sigCount, setSigCount] = useState(0);
  const [keysState, setKeysState] = useState([]);
  const [execResult, setExecResult] = useState(null);

  const showError = (msg) => {
    setError(msg);
    setSnackOpen(true);
  };

  // ── Step 0: Generate Keys ──────────────────────────────────────────────────

  const handleNumSignersChange = (_, val) => {
    setNumSigners(val);
    if (threshold > val) setThreshold(val);
  };

  const handleThresholdChange = (_, val) => {
    setThreshold(val);
  };

  const handleGenerateKeys = async () => {
    setLoading(true);
    try {
      const generated = [];
      for (let i = 0; i < numSigners; i++) {
        const privateKey = await PrivateKey.generateED25519();
        const publicKey = privateKey.publicKey;
        generated.push({ label: `Key ${i + 1}`, privateKey, publicKey, signed: false });
      }
      setKeys(generated);
    } catch (e) {
      showError("Failed to generate keys: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 1: Create Multisig Account ───────────────────────────────────────

  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const publicKeys = keys.map((k) => k.publicKey);
      const keyList = new KeyList(publicKeys, threshold);
      const tx = await new AccountCreateTransaction()
        .setKey(keyList)
        .setInitialBalance(new Hbar(parseFloat(initialBalance)))
        .execute(client);
      const receipt = await tx.getReceipt(client);
      const accountId = receipt.accountId.toString();
      setMultisigAccountId(accountId);
      setKeysState(keys.map((k) => ({ ...k, signed: false })));
      setSigCount(0);
    } catch (e) {
      showError("Failed to create account: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Build Transaction ──────────────────────────────────────────────

  const handleBuildTransaction = async () => {
    const recipient = recipientRef.current?.value?.trim();
    const amount = amountRef.current?.value?.trim();
    if (!recipient) { showError("Recipient account ID is required."); return; }
    if (!amount || isNaN(parseFloat(amount))) { showError("Valid amount is required."); return; }

    setLoading(true);
    try {
      const tx = await new TransferTransaction()
        .addHbarTransfer(multisigAccountId, Hbar.from(-parseFloat(amount)))
        .addHbarTransfer(recipient, Hbar.from(parseFloat(amount)))
        .freezeWith(client);
      frozenTxRef.current = tx;
      setTxSummary({ from: multisigAccountId, to: recipient, amount });
      setActiveStep(3);
    } catch (e) {
      showError("Failed to build transaction: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Sign & Execute ─────────────────────────────────────────────────

  const handleSign = async (index) => {
    setLoading(true);
    try {
      await frozenTxRef.current.sign(keysState[index].privateKey);
      setKeysState((prev) =>
        prev.map((k, i) => (i === index ? { ...k, signed: true } : k))
      );
      setSigCount((c) => c + 1);
    } catch (e) {
      showError("Failed to sign: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const response = await frozenTxRef.current.execute(client);
      const receipt = await response.getReceipt(client);
      setExecResult({
        txId: response.transactionId.toString(),
        status: receipt.status.toString(),
        from: txSummary.from,
        to: txSummary.to,
        amount: txSummary.amount,
      });
    } catch (e) {
      showError("Failed to execute: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setActiveStep(0);
    setNumSigners(3);
    setThreshold(2);
    setKeys([]);
    setInitialBalance("5");
    setMultisigAccountId("");
    setTxSummary(null);
    frozenTxRef.current = null;
    setSigCount(0);
    setKeysState([]);
    setExecResult(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const progressPct = Math.min((sigCount / threshold) * 100, 100);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderKeyCards = (keyArray, showSignButton = false) => (
    <Grid container spacing={1.5} sx={{ mt: 1 }}>
      {keyArray.map((k, i) => (
        <Grid item xs={12} sm={6} key={i}>
          <Card {...cardStyle}>
            <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
              <Typography {...labelUppercase}>{k.label}</Typography>
              <Typography
                variant="body2"
                sx={{ fontFamily: "monospace", wordBreak: "break-all", mt: 0.5, color: "text.primary" }}
              >
                {truncateKey(k.publicKey.toStringRaw())}
              </Typography>
              {showSignButton && (
                <Box sx={{ mt: 1 }}>
                  {k.signed ? (
                    <Chip
                      icon={<CheckCircleIcon />}
                      label="Signed ✓"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="info"
                      sx={btnStyle}
                      onClick={() => handleSign(i)}
                    >
                      Sign
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // ── Step panels ────────────────────────────────────────────────────────────

  const renderStep0 = () => (
    <Card {...cardStyle}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 3 }}>
          Configure Keys
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} sm={6}>
            <Typography {...labelUppercase}>Signers (N): {numSigners}</Typography>
            <Slider
              value={numSigners}
              min={2}
              max={5}
              step={1}
              marks
              onChange={handleNumSignersChange}
              sx={{ color: ACCENT, mt: 1 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography {...labelUppercase}>Threshold (M): {threshold}</Typography>
            <Slider
              value={threshold}
              min={1}
              max={numSigners}
              step={1}
              marks
              onChange={handleThresholdChange}
              sx={{ color: ACCENT, mt: 1 }}
            />
          </Grid>
        </Grid>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            sx={{ ...btnStyle, bgcolor: PRIMARY, "&:hover": { bgcolor: "#1a1740" } }}
            onClick={handleGenerateKeys}
          >
            Generate Keys
          </Button>
        </Box>

        {keys.length > 0 && (
          <>
            {renderKeyCards(keys)}
            <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                sx={{ ...btnStyle, bgcolor: ACCENT, "&:hover": { bgcolor: "#4a57c0" } }}
                onClick={() => setActiveStep(1)}
              >
                Next →
              </Button>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );

  const renderStep1 = () => (
    <Card {...cardStyle}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>
          Create Multisig Account
        </Typography>

        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            mb: 3,
            bgcolor: "grey.50",
          }}
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            Threshold Key: requires{" "}
            <strong>{threshold}</strong> of <strong>{numSigners}</strong> signatures
          </Typography>
          {keys.map((k, i) => (
            <Typography key={i} variant="body2" sx={{ fontFamily: "monospace", color: "text.secondary" }}>
              {k.label}: {truncateKey(k.publicKey.toStringRaw())}
            </Typography>
          ))}
        </Box>

        <TextField
          label="Initial Balance (HBAR)"
          size="small"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          sx={{ mb: 3, width: 240 }}
        />

        <Box>
          <Button
            variant="contained"
            sx={{ ...btnStyle, bgcolor: PRIMARY, "&:hover": { bgcolor: "#1a1740" } }}
            onClick={handleCreateAccount}
          >
            Create Multisig Account
          </Button>
        </Box>

        {multisigAccountId && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              border: "1px solid",
              borderColor: "success.main",
              borderRadius: 1,
              bgcolor: "success.50",
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Account created:{" "}
              <Link
                href={`https://hashscan.io/testnet/account/${multisigAccountId}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: ACCENT }}
              >
                {multisigAccountId}
              </Link>
            </Typography>
            <IconButton size="small" onClick={() => copyToClipboard(multisigAccountId)}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {multisigAccountId && (
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              sx={{ ...btnStyle, bgcolor: ACCENT, "&:hover": { bgcolor: "#4a57c0" } }}
              onClick={() => setActiveStep(2)}
            >
              Next →
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card {...cardStyle}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>
          Build Transaction
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Typography {...labelUppercase}>From</Typography>
          <Box
            sx={{
              mt: 0.5,
              p: 1.5,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "grey.50",
              fontFamily: "monospace",
              fontSize: 14,
            }}
          >
            {multisigAccountId}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
          <TextField
            label="Recipient Account ID"
            size="small"
            inputRef={recipientRef}
            fullWidth
          />
          <TextField
            label="Amount (HBAR)"
            size="small"
            inputRef={amountRef}
            defaultValue="1"
            fullWidth
          />
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            variant="contained"
            sx={{ ...btnStyle, bgcolor: PRIMARY, "&:hover": { bgcolor: "#1a1740" } }}
            onClick={handleBuildTransaction}
          >
            Build Transaction
          </Button>
        </Box>

        {txSummary && (
          <Card
            {...cardStyle}
            sx={{ ...cardStyle.sx, mt: 3, bgcolor: "grey.50" }}
          >
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography {...labelUppercase} sx={{ ...labelUppercase.sx, mb: 1 }}>
                Transaction Summary
              </Typography>
              <Typography variant="body2">From: {txSummary.from}</Typography>
              <Typography variant="body2">To: {txSummary.to}</Typography>
              <Typography variant="body2">Amount: {txSummary.amount} HBAR</Typography>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card {...cardStyle}>
      <CardContent>
        <Typography variant="h6" sx={{ fontWeight: 700, color: PRIMARY, mb: 2 }}>
          Sign & Execute
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              <strong>{sigCount}</strong> of <strong>{threshold}</strong> signatures collected
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progressPct)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPct}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "grey.200",
              "& .MuiLinearProgress-bar": { bgcolor: sigCount >= threshold ? "success.main" : ACCENT },
            }}
          />
        </Box>

        {sigCount >= threshold && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              border: "1px solid",
              borderColor: "success.main",
              borderRadius: 1,
              bgcolor: "success.50",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CheckCircleIcon color="success" fontSize="small" />
            <Typography variant="body2" color="success.dark" sx={{ fontWeight: 600 }}>
              Threshold met — ready to execute
            </Typography>
          </Box>
        )}

        {renderKeyCards(keysState, true)}

        <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Button
            variant="contained"
            disabled={sigCount < threshold}
            sx={{ ...btnStyle, bgcolor: PRIMARY, "&:hover": { bgcolor: "#1a1740" }, "&.Mui-disabled": { bgcolor: "grey.300" } }}
            onClick={handleExecute}
          >
            Execute Transaction
          </Button>
          <Button variant="outlined" sx={{ ...btnStyle, borderColor: "divider", color: "text.secondary" }} onClick={handleStartOver}>
            Start Over
          </Button>
        </Box>

        {execResult && (
          <Card {...cardStyle} sx={{ ...cardStyle.sx, mt: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <CheckCircleIcon color="success" />
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Transaction Executed
                </Typography>
                <Chip label={execResult.status} color="success" size="small" />
              </Box>

              <Typography {...labelUppercase} sx={{ ...labelUppercase.sx, mb: 0.5 }}>
                Transaction ID
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Link
                  href={`https://hashscan.io/testnet/transaction/${encodeURIComponent(execResult.txId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ color: ACCENT, fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}
                >
                  {execResult.txId}
                </Link>
                <IconButton size="small" onClick={() => copyToClipboard(execResult.txId)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>

              <Typography variant="body2">
                {execResult.from} → {execResult.to}
              </Typography>
              <Typography variant="body2">Amount: {execResult.amount} HBAR</Typography>
              <Typography variant="body2">
                Signatures used: {sigCount} of {numSigners} ({threshold} required)
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Button
                  variant="outlined"
                  sx={{ ...btnStyle, borderColor: ACCENT, color: ACCENT }}
                  onClick={handleStartOver}
                >
                  Start Over
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <LockPerson fontSize="small" />
        <Typography variant="h5" fontWeight={700}>Multi-Signature</Typography>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel
              sx={{
                "& .MuiStepLabel-label": { fontWeight: activeStep === STEPS.indexOf(label) ? 700 : 400 },
                "& .MuiStepIcon-root.Mui-active": { color: ACCENT },
                "& .MuiStepIcon-root.Mui-completed": { color: PRIMARY },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Box>
        {activeStep === 0 && renderStep0()}
        {activeStep === 1 && renderStep1()}
        {activeStep === 2 && renderStep2()}
        {activeStep === 3 && renderStep3()}
      </Box>

      {/* Loading backdrop */}
      <Backdrop open={loading} sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}>
        <CircularProgress sx={{ color: ACCENT }} />
      </Backdrop>

      {/* Error snackbar */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setSnackOpen(false)} sx={{ width: "100%" }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MultiSig;
