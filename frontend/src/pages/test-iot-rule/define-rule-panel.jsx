/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useState} from "react";
import {CodeEditor, Container, FormField, Header, Select, SpaceBetween,} from "@cloudscape-design/components";
import {CODE_EDITOR_I18N_STRINGS,} from "../../form-config";
import "ace-builds/css/ace.css";
import "ace-builds/css/theme/dawn.css";
import "ace-builds/css/theme/tomorrow_night_bright.css";

export default function DefineRulePanel({
                                          setSql,
                                          setAwsIotSqlVersion,
                                          awsIotSqlVersion,
                                          sql,
                                        }) {
  const [selectedOption, setSelectedOption] = React.useState({
    label: awsIotSqlVersion,
    value: awsIotSqlVersion,
  });
  const [ace, setAce] = useState(undefined);
  const [codeEditorLoading, setCodeEditorLoading] = useState(true);
  const [codeEditorValue, setCodeEditorValue] = useState(sql);
  const [codeEditorPreferences, setCodeEditorPreferences] = useState(undefined);

  useEffect(() => {
    async function loadAce() {
      const ace = await import("ace-builds");
      await import("ace-builds/webpack-resolver");
      ace.config.set("useStrictCSP", true);

      return ace;
    }

    loadAce()
      .then((ace) => setAce(ace))
      .finally(() => setCodeEditorLoading(false));
  }, []);
  const onCodeEditorChange = (e) => {
    setCodeEditorValue(e.detail.value);
    setSql(e.detail.value);
  };

  const onCodeEditorPreferencesChange = (e) => {
    setCodeEditorPreferences(e.detail);
  };

  return (
    <Container
      fitHeight
      header={
        <Header
          variant="h2"
          /*info={
            <InfoLink
              onFollow={() => loadHelpPanelContent(9)}
              ariaLabel={'Information about cache behavior settings.'}
            />
          }*/
        >
          SQL statement
        </Header>
      }
      //footer={<CacheBehaviorFooter readOnlyWithErrors={readOnlyWithErrors} />}
    >
      <SpaceBetween size="l">
        <FormField
          label="SQL version"
          description="The version of the SQL rules engine to use when evaluating the rule."
          //i18nStrings={{ errorIconAriaLabel: "Error" }}
        >
          <Select
            selectedOption={selectedOption}
            onChange={({detail}) => {
              setSelectedOption(detail.selectedOption);
              setAwsIotSqlVersion(detail.selectedOption.value);
            }}
            options={[
              {label: "2016-03-23", value: "2016-03-23"},
              {label: "2015-10-08", value: "2015-10-08"},
              {label: "beta", value: "beta"},
            ]}
            selectedAriaLabel="Selected"
          />
        </FormField>

        <FormField
          label="SQL statement"
          description="Enter a SQL statement using the following: SELECT <Attribute> FROM <Topic Filter> WHERE <Condition>. For example: SELECT temperature FROM 'iot/topic' WHERE temperature > 50."
          stretch={true}
        >
          <CodeEditor
            ace={ace}
            value={codeEditorValue}
            language="sql"
            onChange={onCodeEditorChange}
            preferences={codeEditorPreferences}
            onPreferencesChange={onCodeEditorPreferencesChange}
            loading={codeEditorLoading}
            i18nStrings={CODE_EDITOR_I18N_STRINGS}
            editorContentHeight={300}
          />
        </FormField>
      </SpaceBetween>
    </Container>
  );
}
