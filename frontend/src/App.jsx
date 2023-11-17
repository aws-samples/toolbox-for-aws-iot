/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import "./App.css";
import {AppLayout, ContentLayout} from "@cloudscape-design/components";
import React, {useEffect, useRef, useState} from "react";
import {TestRuleContent} from "./pages/test-iot-rule/test-rule-page";
import {ReplayMessageContent} from "./pages/replay-messages/replay-message-page";
import {RecordMessageContent} from "./pages/record-messages/record-message-page";
import {Authenticator} from "@aws-amplify/ui-react";
import {InfoLink} from "./components/info-link";
import Header from "@cloudscape-design/components/header";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ToolsContent from "./components/tools-content";

//import {DashboardSideNavigation} from "./components/side-navigation";
//import { Navigation } from "./components/side-navigation";
import {Route, Routes, useLocation} from "react-router-dom";
import {DashboardSideNavigation} from "./components/side-navigation";
import {ServiceTopNavigation} from "./components/top-navigation";
import {RequireAuth} from "./components/require-auth";
import {Login} from "./components/login";

import {AmplifyConfig as config} from "./Config";
import {Amplify} from "aws-amplify";
import { StartReplayContent } from "./pages/start-replay/start-replay-page";

Amplify.configure(config);

function PageHeader({loadHelpPanelContent, index, setToolsIndex}) {
  const location = useLocation()
  const [items, setItems] = useState([]);
  const [header, setHeader] = useState("Toolbox for AWS IoT");

  const currentRoute = location.pathname;
  useEffect(() => {
    let header = "";
    let toolsIndex;

    if (currentRoute === "/replay") {
      header = "Replay MQTT Messages";
      toolsIndex = 2
    } else if (currentRoute === "/replay/start") {
      header = "Start new replay";
      toolsIndex = 3;
    }else if (currentRoute === "/record") {
      header = "Record MQTT Messages";
      toolsIndex = 1;
    } else {
      header = "Test IoT SQL Statement";
      toolsIndex = 0;
    }
    setToolsIndex(toolsIndex);
    if (toolsIndex === 3) {
      setItems([
        {text: "Toolbox for AWS IoT", href: "/"},
        {text: "Replay MQTT Messages", href: "/#/replay"},
        {text: header, href: currentRoute},
      ]);
    } else {
      setItems([
        {text: "Toolbox for AWS IoT", href: "/"},
        {text: header, href: currentRoute},
      ]);
    }

    setHeader(header);
  }, [location]);

  return (
    <div>
      <BreadcrumbGroup items={items} ariaLabel="Breadcrumbs"/>
      <Header
        variant="h1"
        info={
          <InfoLink
            id="form-main-info-link"
            onFollow={() => loadHelpPanelContent(index)}
          />
        }
      >
        {header}
      </Header>
    </div>
  );
}

function Content() {
  const [toolsIndex, setToolsIndex] = useState(0);
  const [toolsOpen, setToolsOpen] = useState(false);
  const appLayout = useRef();
  const [navigationOpen, setNavigationOpen] = useState(false);

  const loadHelpPanelContent = (index) => {
    setToolsIndex(index);
    setToolsOpen(true);
    appLayout.current?.focusToolsClose();
  };

  return (
    <AppLayout
      ref={appLayout}
      content={
        <ContentLayout
          header={
            <PageHeader
              loadHelpPanelContent={loadHelpPanelContent}
              index={toolsIndex}
              setToolsIndex={setToolsIndex}
            />
          }
        >
          <Routes>
            <Route
              index
              element={
                <RequireAuth>
                  <TestRuleContent/>
                </RequireAuth>
              }
            />
            <Route
              path="record"
              element={
                <RequireAuth>
                  <RecordMessageContent/>
                </RequireAuth>
              }
            />
            <Route
              path="replay"
              element={
                <RequireAuth>
                  <ReplayMessageContent/>
                </RequireAuth>
              }
            />
            <Route
              path="replay/start"
              element={
                <RequireAuth>
                  <StartReplayContent/>
                </RequireAuth>
              }
            />
            <Route path="login" element={<Login/>}/>
          </Routes>
        </ContentLayout>
      }
      navigation={<DashboardSideNavigation/>}
      navigationOpen={navigationOpen}
      tools={ToolsContent[toolsIndex]}
      toolsOpen={toolsOpen}
      onToolsChange={({detail}) => setToolsOpen(detail.open)}
      onNavigationChange={({detail}) => setNavigationOpen(detail.open)}
      maxContentWidth={Number.MAX_VALUE}
    />
  );
}

function App() {
  return (
    <Authenticator.Provider>
      <ServiceTopNavigation/>
      <Content/>
    </Authenticator.Provider>
  );
}

export default App;
