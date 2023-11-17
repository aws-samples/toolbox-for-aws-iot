/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {SpaceBetween,} from "@cloudscape-design/components";
import StartReplayPanel from "./table-start-replay-panel";


export function StartReplayContent() {
  return (
    <SpaceBetween size="l">
      <StartReplayPanel/>
    </SpaceBetween>
  );
}