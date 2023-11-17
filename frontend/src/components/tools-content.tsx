/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HelpPanel } from '@cloudscape-design/components';

/* eslint-disable react/jsx-key */
const ToolsContent = [
  <HelpPanel
    header={<h2>Test IoT SQL Statement</h2>}
  >
    <p>
    Begin by testing IoT SQL statements using Toolbox for AWS IoT. Follow these steps to input the SQL statement and the test message:
    </p>
    <ul>
      <li>In the Toolbox for AWS IoT interface, locate the section for testing IoT SQL statements.Tea</li>
      <li>Choose one of the following options as your input method
        <ol>
          <li>Custom message<br /> Provide a sample message to retrieve the output of the IoT SQL statement. This message neglects the FROM clause of the SQL statement.</li>
          <li>Topic message<br /> Subscribes to the topic in provided in the FROM clause and test the first incoming message</li>
        </ol>
      </li>
      <li>Once you've configured the input method and provided the necessary details like user and mqqt 5 propertires, proceed to run the test.</li>
    </ul>   
   
    <p>
      Toolbox for AWS IoT will create a temporary IoT rule based on the provided SQL statement.
      The tool will then ingest the designated test message, apply the SQL statement, and process the data.
      Finally, Toolbox for AWS IoT will return the result of the SQL statement, reflecting the outcome of the test.
    </p>
  </HelpPanel>,
  <HelpPanel
    header={<h2>Record MQTT Messages</h2>}
    
  >
    <h5>Create Recording</h5>
    <p>
      Select the topic or topics that you intend to record. These topics will determine the data that the recording will capture.
      After selecting the topic(s), proceed to choose a suitable name for the recording. This name will help identify the recording in the future.
    </p>
    <h5>Managing Recordings</h5>
    <p>
      To stop or delete a recording, follow these steps:
    </p>
    <ul>
      <li>Access the list of existing recordings in the designated interface.</li>
      <li>Locate the recording(s) that you wish to manage.</li>
      <li>Apply the desired action by interacting with the provided buttons</li>
    </ul>
 
  </HelpPanel>,
  <HelpPanel
    header={<h2>Replay MQTT Messages</h2>}
    
  >
    <h5>Start new Replay</h5> 
    <p>
       Click the <i>Start new replay</i>button to begin a new replay. 
    </p>
    <h5>Managing Replays</h5>
    <p>
      To stop replaying a recording, follow these steps:
    </p>
    <ul>
      <li>Access the list of existing recordings in the designated interface.</li>
      <li>Locate the replays(s) that you wish to stop.</li>
      <li>Apply the action by interacting with the provided buttons</li>
    </ul>


  </HelpPanel>,
    <HelpPanel
    header={<h2>Start new replay</h2>}
    
  >
    <h5>Replay Message</h5>
    <p>
      Begin by selecting a recording(s) from the list of available recordings. Once you've chosen a recording, initiate the replaying process.
      Toolbox for AWS IoT will handle the necessary infrastructure to replay the messages as required.
      Messages will be replayed in the same chronological order in which they were originally recorded.
      Replays can occur on the same topic(s) as the original recording, or you have the option to apply an additional prefix to the topics if desired.
    </p>
    <h5>Managing Recordings</h5>
    <p>
      To start or stop replaying a recording, follow these steps:
    </p>
    <ul>
      <li>Access the list of existing recordings in the designated interface.</li>
      <li>Locate the recording(s) that you wish to manage.</li>
      <li>Apply the desired action by interacting with the provided buttons</li>
    </ul>


  </HelpPanel>
];

export default ToolsContent
/* eslint-enable react/jsx-key */