import MirrorNodeAPI from "../api/mirror-node-api";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableBody,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import { Storage } from "@mui/icons-material";

const Network = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const queryNodeAddresses = async () => {
      const api = new MirrorNodeAPI(process.env.REACT_APP_API_URL);
      const response = await api.getNodes();
      const nodes = response.data.nodes;
      const rowsData = nodes.map((node) => {
        const endpoints = node.service_endpoints.map((endpoint) => {
          return endpoint.ip_address_v4 + ":" + endpoint.port;
        });
        return {
          node_id: node.node_id,
          node_account_id: node.node_account_id,
          public_key: node.public_key,
          endpoints: endpoints,
          status: "online",
        };
      });
      setRows(rowsData);
    };
    queryNodeAddresses();
  }, []);
  return (
    <div>
      <Typography gutterBottom variant="h5" component="div">
        <Storage fontSize="small" />{" "}
        <b style={{ marginLeft: "5px" }}>Network</b>
      </Typography>
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <TableContainer>
            <Table aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell width="10%">Node ID</TableCell>
                  <TableCell width="10%">Node Account ID</TableCell>
                  <TableCell width="40%">Public Key</TableCell>
                  <TableCell width="20%">Endpoints</TableCell>
                  <TableCell width="20%">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.node_id}
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell key={row.node_id} component="th" scope="row">
                      {row.node_id}
                    </TableCell>
                    <TableCell>{row.node_account_id}</TableCell>
                    <TableCell>
                      <span
                        style={{
                          display: "inline-block",
                          marginRight: 0,
                          width: "500px",
                          wordWrap: "break-word",
                        }}
                      >
                        {row.public_key}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        style={{
                          display: "inline-block",
                          marginRight: 0,
                          width: "300px",
                          wordWrap: "break-word",
                        }}
                      >
                        {row.endpoints.map((endpoint) => (
                          <div key={endpoint}>{endpoint}</div>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell>{row.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default Network;
