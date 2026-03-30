import React, { useState, useRef, useEffect } from "react";
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
  MenuItem,
  Select,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  CalendarMonth,
  CheckCircle,
  ContentCopy,
  Person,
  PersonOutline,
  Refresh,
} from "@mui/icons-material";
import {
  ScheduleCreateTransaction,
  ScheduleSignTransaction,
  ScheduleInfoQuery,
  TransferTransaction,
  Hbar,
  PrivateKey,
} from "@hashgraph/sdk";

const STEPS = ["Configure", "Account A: Create", "Account B: Inspect", "Account B: Sign"];

const InfoRow = ({ label, value, mono = false }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 95, flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography
      variant="caption"
      sx={{ fontFamily: mono ? "monospace" : "inherit", textAlign: "right", wordBreak: "break-all" }}
    >
      {value ?? "—"}
    </Typography>
  </Box>
);

const RoleTag = ({ label, primary }) => (
  <Chip
    icon={primary ? <Person sx={{ fontSize: "13px !important" }} /> : <PersonOutline sx={{ fontSize: "13px !important" }} />}
    label={label}
    size="small"
    sx={{
      fontSize: "0.7rem",
      height: 20,
      fontWeight: 600,
      backgroundColor: primary ? "#f0f2ff" : "#f0fff4",
      color: primary ? "#5D6DD8" : "#2e7d32",
    }}
  />
);

const ScheduledTransaction = (props) => {
  const [activeStep, setActiveStep] = useState(0);
  const [scheduleId, setScheduleId] = useState(null);
  const [scheduleInfo, setScheduleInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: "", severity: "success", open: false });

  // form values stored in state so they persist across steps
  const [formValues, setFormValues] = useState({ accountBId: "", destination: "", amountA: "", amountB: "" });

  const scheduleIdInputRef = useRef();
  const pollRef = useRef(null);

  const showSnack = (message, severity = "success") =>
    setSnackbar({ message, severity, open: true });

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showSnack("Copied to clipboard");
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // stop polling once executed/deleted
  useEffect(() => {
    if (scheduleInfo?.executed || scheduleInfo?.deleted) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
  }, [scheduleInfo]);

  const fetchInfo = async (id) => {
    const targetId = id || scheduleIdInputRef.current?.value?.trim() || scheduleId;
    if (!targetId) return;
    setInfoLoading(true);
    try {
      const info = await new ScheduleInfoQuery().setScheduleId(targetId).execute(props.client);
      setScheduleInfo(info);
      return info;
    } catch (err) {
      showSnack("Failed to fetch schedule info: " + err.toString(), "error");
    } finally {
      setInfoLoading(false);
    }
  };

  /* ── Step 0 → Step 1: Account A creates the schedule ── */
  const createSchedule = async () => {
    const { accountBId, destination, amountA, amountB } = formValues;
    const a = parseFloat(amountA);
    const b = parseFloat(amountB);
    if (!accountBId || !destination || !a || !b || a <= 0 || b <= 0) {
      showSnack("Please fill in all fields with valid values", "error");
      return;
    }

    setBackdropOpen(true);
    try {
      const innerTx = new TransferTransaction()
        .addHbarTransfer(props.account.accountId, new Hbar(-a))
        .addHbarTransfer(accountBId, new Hbar(-b))
        .addHbarTransfer(destination, new Hbar(a + b));

      const response = await new ScheduleCreateTransaction()
        .setScheduledTransaction(innerTx)
        .setScheduleMemo(`Joint transfer: ${props.account.accountId} + ${accountBId} → ${destination}`)
        .execute(props.client);

      const receipt = await response.getReceipt(props.client);
      const id = receipt.scheduleId.toString();
      setScheduleId(id);
      setActiveStep(1);
      showSnack("Schedule created — share the ID with Account B");
    } catch (err) {
      showSnack("Failed to create schedule: " + err.toString(), "error");
    }
    setBackdropOpen(false);
  };

  /* ── Step 1 → Step 2: move to Account B inspect ── */
  const goToInspect = () => {
    setActiveStep(2);
    // auto-fetch when entering inspect step
    setTimeout(() => fetchInfo(scheduleId), 100);
  };

  /* ── Step 2 → Step 3: Account B inspects then proceeds ── */
  const goToSign = () => setActiveStep(3);

  /* ── Step 3: Account B signs ── */
  const signSchedule = async () => {
    const id = scheduleId || scheduleIdInputRef.current?.value?.trim();
    if (!id) return;

    setBackdropOpen(true);
    try {
      const pk = props.account.keyType === "ECDSA"
        ? PrivateKey.fromStringECDSA(props.account.privateKey)
        : PrivateKey.fromStringED25519(props.account.privateKey);

      const signTx = await new ScheduleSignTransaction()
        .setScheduleId(id)
        .freezeWith(props.client)
        .sign(pk);

      const response = await signTx.execute(props.client);
      await response.getReceipt(props.client);
      showSnack("Signature submitted — checking execution…");

      const info = await fetchInfo(id);
      if (!info?.executed) {
        pollRef.current = setInterval(() => fetchInfo(id), 2000);
      }
      setActiveStep(4);
    } catch (err) {
      showSnack("Failed to sign: " + err.toString(), "error");
    }
    setBackdropOpen(false);
  };

  const isExecuted = !!scheduleInfo?.executed;

  /* ────────────────────────────────────────────────────── */

  const renderStep = () => {
    switch (activeStep) {
      /* ── Step 0: Configure ── */
      case 0:
        return (
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <RoleTag label="Account A (You)" primary />
                <Typography variant="subtitle1" fontWeight={700}>Configure Transfer</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                Set up a joint HBAR transfer that requires signatures from two accounts.
                Account A signs on creation; Account B must separately sign to execute.
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    From (Account A)
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={props.account.accountId}
                    disabled
                    inputProps={{ style: { fontFamily: "monospace" } }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    Amount from A (HBAR)
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    fullWidth
                    type="number"
                    placeholder="e.g. 1"
                    value={formValues.amountA}
                    onChange={(e) => setFormValues((v) => ({ ...v, amountA: e.target.value }))}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    From (Account B)
                  </Typography>
                  {(() => {
                    const otherAccounts = (props.accounts || []).filter(
                      (a) => a.accountId !== props.account.accountId
                    );
                    return otherAccounts.length > 0 ? (
                      <Select
                        size="small"
                        fullWidth
                        displayEmpty
                        value={formValues.accountBId}
                        onChange={(e) => setFormValues((v) => ({ ...v, accountBId: e.target.value }))}
                        sx={{ fontFamily: "monospace" }}
                      >
                        <MenuItem value="" disabled>
                          <Typography variant="body2" color="text.disabled">Select an account</Typography>
                        </MenuItem>
                        {otherAccounts.map((a) => (
                          <MenuItem key={a.accountId} value={a.accountId} sx={{ fontFamily: "monospace" }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                                {a.accountId}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {a.keyType || "ED25519"}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <TextField
                        variant="outlined"
                        size="small"
                        fullWidth
                        placeholder="e.g. 0.0.12345"
                        value={formValues.accountBId}
                        onChange={(e) => setFormValues((v) => ({ ...v, accountBId: e.target.value }))}
                        inputProps={{ style: { fontFamily: "monospace" } }}
                        helperText="No other accounts saved — type an ID manually"
                      />
                    );
                  })()}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    Amount from B (HBAR)
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    fullWidth
                    type="number"
                    placeholder="e.g. 1"
                    value={formValues.amountB}
                    onChange={(e) => setFormValues((v) => ({ ...v, amountB: e.target.value }))}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Box>
                <Box sx={{ gridColumn: { sm: "1 / -1" } }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    Destination Account ID
                  </Typography>
                  <TextField
                    variant="outlined"
                    size="small"
                    fullWidth
                    placeholder="e.g. 0.0.67890"
                    value={formValues.destination}
                    onChange={(e) => setFormValues((v) => ({ ...v, destination: e.target.value }))}
                    inputProps={{ style: { fontFamily: "monospace" } }}
                  />
                </Box>
              </Box>

              {/* Transfer summary */}
              {formValues.amountA && formValues.amountB && formValues.destination && (
                <Box sx={{ p: 1.5, mb: 2, borderRadius: 1, backgroundColor: "#fafafa", border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5 }}>
                    Transfer Summary
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block", fontFamily: "monospace" }}>
                    {props.account.accountId} → −{formValues.amountA} ℏ
                  </Typography>
                  {formValues.accountBId && (
                    <Typography variant="caption" sx={{ display: "block", fontFamily: "monospace" }}>
                      {formValues.accountBId} → −{formValues.amountB} ℏ
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ display: "block", fontFamily: "monospace", color: "#2e7d32", fontWeight: 600 }}>
                    {formValues.destination} → +{(parseFloat(formValues.amountA || 0) + parseFloat(formValues.amountB || 0)).toFixed(2)} ℏ
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                color="primary"
                startIcon={<CalendarMonth />}
                onClick={createSchedule}
                sx={{ textTransform: "none" }}
              >
                Create & Sign Schedule
              </Button>
            </CardContent>
          </Card>
        );

      /* ── Step 1: Schedule Created ── */
      case 1:
        return (
          <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <RoleTag label="Account A (You)" primary />
                <Typography variant="subtitle1" fontWeight={700}>Schedule Created</Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, p: 0.75, borderRadius: 1, backgroundColor: "#f0fff4", border: "1px solid #c6f6d5", width: "fit-content" }}>
                <CheckCircle sx={{ fontSize: 16, color: "#2e7d32" }} />
                <Typography variant="caption" color="#2e7d32" fontWeight={600}>
                  Your signature has been collected automatically
                </Typography>
              </Box>

              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Schedule ID — share this with Account B
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1.5,
                  mb: 2.5,
                  borderRadius: 1,
                  backgroundColor: "#f0f2ff",
                  border: "1px solid #d4d8ff",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ fontFamily: "monospace", fontWeight: 700, color: "#5D6DD8", flex: 1, fontSize: "1rem" }}
                >
                  <a
                    href={`https://hashscan.io/testnet/schedule/${scheduleId}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#5D6DD8" }}
                  >
                    {scheduleId}
                  </a>
                </Typography>
                <Tooltip title="Copy Schedule ID">
                  <IconButton size="small" onClick={() => copyToClipboard(scheduleId)}>
                    <ContentCopy sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ p: 1.5, mb: 2.5, borderRadius: 1, backgroundColor: "#fffbf0", border: "1px solid #fde68a" }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.8 }}>
                  The schedule is now <strong>pending</strong> on-chain. Account B needs to sign it with their private key.
                  Once both signatures are collected, the transfer executes <strong>automatically</strong>.
                </Typography>
              </Box>

              <Button variant="contained" color="primary" onClick={goToInspect} sx={{ textTransform: "none" }}>
                Continue — Account B Inspects →
              </Button>
            </CardContent>
          </Card>
        );

      /* ── Step 2: Account B Inspects ── */
      case 2:
        return (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>

            {/* Left: inspect */}
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <RoleTag label="Account B" />
                  <Typography variant="subtitle1" fontWeight={700}>Inspect Schedule</Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <TextField
                    label="Schedule ID"
                    variant="outlined"
                    size="small"
                    fullWidth
                    defaultValue={scheduleId || ""}
                    inputRef={scheduleIdInputRef}
                    inputProps={{ style: { fontFamily: "monospace" } }}
                  />
                  <Tooltip title="Fetch info">
                    <Button
                      variant="outlined"
                      onClick={() => fetchInfo()}
                      disabled={infoLoading}
                      sx={{ minWidth: 44, px: 1.5 }}
                    >
                      {infoLoading ? <CircularProgress size={16} /> : <Refresh />}
                    </Button>
                  </Tooltip>
                </Box>

                {scheduleInfo ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Schedule Details</Typography>
                      <Chip
                        label={isExecuted ? "Executed" : scheduleInfo.deleted ? "Deleted" : "Pending"}
                        color={isExecuted ? "success" : scheduleInfo.deleted ? "error" : "warning"}
                        size="small"
                        sx={{ fontSize: "0.7rem", height: 20 }}
                      />
                    </Box>
                    <InfoRow label="Creator" value={scheduleInfo.creatorAccountId?.toString()} mono />
                    <InfoRow label="Memo" value={scheduleInfo.scheduleMemo || "(none)"} />
                    <InfoRow
                      label="Expiration"
                      value={scheduleInfo.expirationTime?.toDate().toLocaleString() ?? "Default"}
                    />
                    <InfoRow
                      label="Executed at"
                      value={scheduleInfo.executed ? scheduleInfo.executed.toDate().toLocaleString() : "—"}
                    />

                    <Divider sx={{ my: 0.5 }} />

                    <Typography variant="caption" color="text.secondary" fontWeight={600}>Inner Transfer</Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#b91c1c" }}>
                      {props.account.accountId} → −{formValues.amountA} ℏ
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#b91c1c" }}>
                      {formValues.accountBId} → −{formValues.amountB} ℏ
                    </Typography>
                    <Typography variant="caption" sx={{ fontFamily: "monospace", color: "#2e7d32", fontWeight: 600 }}>
                      {formValues.destination} → +{(parseFloat(formValues.amountA || 0) + parseFloat(formValues.amountB || 0)).toFixed(2)} ℏ
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ py: 4, textAlign: "center", color: "text.disabled" }}>
                    <CalendarMonth sx={{ fontSize: 36, opacity: 0.2, display: "block", mx: "auto", mb: 1 }} />
                    <Typography variant="caption">Enter a Schedule ID and press refresh</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Right: proceed to sign */}
            <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <RoleTag label="Account B" />
                  <Typography variant="subtitle1" fontWeight={700}>Verified?</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Account B should review the transfer details above before signing. Once you sign, the transfer
                  executes <strong>immediately</strong> — it cannot be reversed.
                </Typography>
                <Box sx={{ p: 1.5, mb: 2.5, borderRadius: 1, backgroundColor: "#fafafa", border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 1 }}>
                    Signatures required
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      icon={<CheckCircle sx={{ fontSize: "14px !important", color: "#2e7d32 !important" }} />}
                      label={`Account A (${props.account.accountId})`}
                      size="small"
                      sx={{ fontSize: "0.7rem", height: 22, backgroundColor: "#f0fff4", color: "#2e7d32", fontFamily: "monospace" }}
                    />
                    <Chip
                      label={`Account B (${formValues.accountBId || "…"})`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.7rem", height: 22, fontFamily: "monospace" }}
                    />
                  </Box>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={goToSign}
                  fullWidth
                  sx={{ textTransform: "none" }}
                  disabled={!scheduleInfo}
                >
                  Looks Good — Sign as Account B →
                </Button>
              </CardContent>
            </Card>
          </Box>
        );

      /* ── Step 3 / 4: Account B Signs + result ── */
      case 3:
      case 4:
        return (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, alignItems: "start" }}>

            {/* Sign card */}
            {(() => {
              const isAccountB = props.account.accountId === formValues.accountBId;
              return (
                <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", opacity: isExecuted ? 0.6 : 1, transition: "opacity 0.3s" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                      <RoleTag label="Account B" />
                      <Typography variant="subtitle1" fontWeight={700}>Sign Schedule</Typography>
                    </Box>

                    {/* Current account indicator */}
                    <Box sx={{ p: 1.5, mb: 2, borderRadius: 1, backgroundColor: "#fafafa", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                        Signed in as
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600, flex: 1 }}>
                          {props.account.accountId}
                        </Typography>
                        {isAccountB
                          ? <Chip label="Account B ✓" size="small" color="success" sx={{ fontSize: "0.7rem", height: 20 }} />
                          : <Chip label="Not Account B" size="small" color="warning" sx={{ fontSize: "0.7rem", height: 20 }} />
                        }
                      </Box>
                    </Box>

                    {!isAccountB && !isExecuted && (
                      <Box sx={{ p: 1.5, mb: 2, borderRadius: 1, backgroundColor: "#fffbf0", border: "1px solid #fde68a" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.8, display: "block" }}>
                          Switch to <strong style={{ fontFamily: "monospace" }}>{formValues.accountBId}</strong> using
                          the account selector in the top navbar, then come back here to sign.
                        </Typography>
                      </Box>
                    )}

                    <Button
                      variant="contained"
                      color="primary"
                      onClick={signSchedule}
                      disabled={isExecuted || !isAccountB}
                      fullWidth
                      sx={{ textTransform: "none" }}
                    >
                      {isExecuted ? "Signed & Executed" : `Sign as ${formValues.accountBId || "Account B"}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Execution result */}
            <Card elevation={0} sx={{ border: "1px solid", borderColor: isExecuted ? "#c6f6d5" : "divider" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>Execution Status</Typography>
                  {!isExecuted && <CircularProgress size={14} thickness={5} />}
                </Box>

                {isExecuted ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.5, borderRadius: 1, backgroundColor: "#f0fff4", border: "1px solid #c6f6d5" }}>
                      <CheckCircle sx={{ fontSize: 24, color: "#2e7d32" }} />
                      <Box>
                        <Typography variant="body2" fontWeight={700} color="#2e7d32">Transfer Executed!</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Both signatures collected — executed automatically
                        </Typography>
                      </Box>
                    </Box>

                    <Divider />

                    <InfoRow label="Executed at" value={scheduleInfo?.executed?.toDate().toLocaleString()} />
                    <InfoRow label="From A" value={`${props.account.accountId}  −${formValues.amountA} ℏ`} mono />
                    <InfoRow label="From B" value={`${formValues.accountBId}  −${formValues.amountB} ℏ`} mono />
                    <InfoRow label="To dest." value={`${formValues.destination}  +${(parseFloat(formValues.amountA || 0) + parseFloat(formValues.amountB || 0)).toFixed(2)} ℏ`} mono />

                    <Divider />

                    <Button
                      variant="outlined"
                      size="small"
                      href={`https://hashscan.io/testnet/schedule/${scheduleId}`}
                      target="_blank"
                      rel="noreferrer"
                      sx={{ textTransform: "none" }}
                    >
                      View on HashScan →
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ py: 4, textAlign: "center", color: "text.disabled" }}>
                    <CircularProgress size={28} thickness={4} sx={{ display: "block", mx: "auto", mb: 1.5 }} />
                    <Typography variant="body2">Waiting for execution…</Typography>
                    <Typography variant="caption">Polling every 2 seconds</Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <Backdrop sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }} open={backdropOpen}>
        <CircularProgress color="inherit" />
      </Backdrop>
      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        autoHideDuration={4000}
        open={snackbar.open}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        <CalendarMonth fontSize="small" />
        <Typography variant="h5" fontWeight={700}>Scheduled Transaction</Typography>
      </Box>

      {/* Stepper */}
      <Stepper
        activeStep={Math.min(activeStep, STEPS.length - 1)}
        sx={{ mb: 3, "& .MuiStepLabel-label": { fontSize: "0.8rem" } }}
      >
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      {renderStep()}
    </div>
  );
};

export default ScheduledTransaction;
