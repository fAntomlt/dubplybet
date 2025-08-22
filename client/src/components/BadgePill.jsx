import React from "react";
import styled from "styled-components";
import * as Fi from "react-icons/fi";
import { FaTrophy } from "react-icons/fa";

const ICONS = { ...Fi, FaTrophy };

export default function BadgePill({ badge, onClick, size="sm", title }) {
  const Icon = ICONS[badge?.icon] || Fi.FiAward;
  return (
    <Wrap
      onClick={onClick}
      $bg={badge?.bg || "#eef2ff"}
      $fg={badge?.color || "#1f2937"}
      $size={size}
      title={title || badge?.name}
      role="button"
      tabIndex={0}
    >
      <Icon aria-hidden style={{ marginRight: 6 }} />
      <span>{badge?.name}</span>
    </Wrap>
  );
}

const Wrap = styled.span`
  display: inline-flex; align-items: center;
  padding: ${({$size}) => $size==="sm" ? "4px 8px" : "6px 10px"};
  font-size: ${({$size}) => $size==="sm" ? "11px" : "12px"};
  font-weight: 900;
  border-radius: 9999px;
  background: ${({$bg}) => $bg};
  color: ${({$fg}) => $fg};
  border: 0;
  user-select: none;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .15s ease;
  &:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(2,6,23,.12); }
  &:active { transform: translateY(0); }
`;