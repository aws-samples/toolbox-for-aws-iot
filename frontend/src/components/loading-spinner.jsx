/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {Box, Container, SpaceBetween, Spinner} from "@cloudscape-design/components";

export default function LoadingSpinner() {
  return (
    <Container>
      <Box textAlign={"center"}>
        <SpaceBetween size={"s"} direction={"vertical"}>
          <Spinner size={"large"}/>
          <Box>Loading</Box>
        </SpaceBetween>
      </Box>
    </Container>

  )
}

