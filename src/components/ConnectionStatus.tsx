import React, { useState } from "react";
import { Activity } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  pingMs?: number;
  serverLocation?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  pingMs = 24,
  serverLocation = "مرکز داده تهران",
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className="connection-status-container"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      {/* Detailed Tooltip Card */}
      {showDetails && (
        <div className="connection-tooltip-card">
          <div className="connection-tooltip-row">
            <span className="connection-tooltip-label">تاخیر شبکه (پینگ):</span>
            <span className="connection-tooltip-ping">
              {isConnected ? `${pingMs} ms` : "---"}
            </span>
          </div>
          <div className="connection-tooltip-divider" />
          <div className="connection-tooltip-row">
            <span className="connection-tooltip-label">سرور متصل:</span>
            <span className="connection-tooltip-value">{serverLocation}</span>
          </div>
        </div>
      )}

      {/* Main Status Badge */}
      <div
        className={`connection-badge-pill ${
          isConnected ? "is-connected" : "is-disconnected"
        }`}
      >
        <span className="connection-beacon-dot">
          <span className="beacon-ping" />
          <span className="beacon-core" />
        </span>
        <span className="connection-badge-text">
          {isConnected ? "ارتباط برخط فعال" : "قطع ارتباط"}
        </span>
        <Activity size={14} className="connection-badge-icon" />
      </div>
    </div>
  );
};

export default ConnectionStatus;
