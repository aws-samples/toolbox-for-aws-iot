/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useCallback, useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {useCollection} from "@cloudscape-design/collection-hooks";
import {API} from "aws-amplify";
import {
  ENDPOINT_GET_REPLAY_MESSAGES,
  ENDPOINT_STOP_REPLAY_MESSAGES,
  PROGRESS_STATUS,
  TOOLBOX_API,
} from "../../commons/constants";
import {
  Box,
  Button,
  CollectionPreferences,
  Header,
  Icon,
  Pagination,
  SpaceBetween,
  Table,
  TextFilter,
} from "@cloudscape-design/components";

import {collectionPreferencesProps, columnDefinitions, getMatchesCountText, paginationLabels,} from "./table-config";

function EmptyState({title, subtitle, action}) {
  return (
    <Box textAlign="center" color="inherit">
      <Box variant="strong" textAlign="center" color="inherit">
        {title}
      </Box>
      <Box variant="p" padding={{bottom: "s"}} color="inherit">
        {subtitle}
      </Box>
      {action}
    </Box>
  );
}

export default function TableReplayMessagePanel() {
  const [replayItems, setReplayItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadItems, setReloadItems] = useState(true);

  async function getReplays() {
    setIsLoading(true);

    await API.get(TOOLBOX_API, ENDPOINT_GET_REPLAY_MESSAGES, {})
      .then((data) => {
        setReplayItems(data.items);
        setReloadItems(false)
        setIsLoading(false);
        console.log(data.items);

        if (data?.error) {
          console.log(data.error);
        }
      })
      .catch((error) => {
        console.log(error);
        setIsLoading(false);
      });
  }

  useEffect(() => {
    getReplays();
  }, [reloadItems]);

  async function stopReplaying(recordingId, replayId) {
    setIsLoading(true);
    await API.post(TOOLBOX_API, ENDPOINT_STOP_REPLAY_MESSAGES, {
      body: {recordingId: recordingId, replayId: replayId},
    })
      .then((data) => {
        console.log(data);

        if (data?.error) {
          console.log(data.error);
        }
        setReloadItems(true)
      })
      .catch((error) => {
        console.log(error);
        setIsLoading(false);
      });
  }

  const [preferences, setPreferences] = useState({
    pageSize: 10,
    visibleContent: ["name", "status", "topic", "replayId", "recordingId"],
  });
  const {
    items,
    actions,
    filteredItemsCount,
    collectionProps,
    filterProps,
    paginationProps,
  } = useCollection(replayItems, {
    filtering: {
      empty: (
        <EmptyState title="No replays" subtitle="No replays to display."/>
      ),
      noMatch: (
        <EmptyState
          title="No matches"
          subtitle="We can’t find a match."
          action={
            <Button onClick={() => actions.setFiltering("")}>
              Clear filter
            </Button>
          }
        />
      ),
    },
    pagination: {pageSize: preferences.pageSize},
    sorting: {
      defaultState: {
        sortingColumn: {
          sortingField: "replayId",
          sortingComparator: (a, b) =>
            a.replayId.valueOf() - b.replayId.valueOf()
        },
        isDescending: true
      }
    },
    selection: {},
  });
  const {selectedItems} = collectionProps;

  let navigate = useNavigate();
  const goToStartReplayPage = () => {
    let path = `/replay/start`;
    navigate(path);
  };
  return (
    <SpaceBetween size="l">
      <Table
        {...collectionProps}
        selectionType="multi"
        header={
          <Header
            counter={
              selectedItems.length
                ? `(${selectedItems.length}/${replayItems.length})`
                : `(${replayItems.length})`
            }
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={() => getReplays()}>
                  <Icon name="refresh"/>
                </Button>
                <Button
                  variant="primary"
                  disabled={selectedItems.length === 0 ||
                    !selectedItems.some((item) => item.status === PROGRESS_STATUS.IN_PROGRESS) ||
                    selectedItems.length > 1}
                  onClick={() =>
                    stopReplaying(
                      selectedItems[0].recordingId,
                      selectedItems[0].replayId
                    )
                  }
                >
                  Cancel replay
                </Button>

                <Button
                  variant="primary"
                  onClick={goToStartReplayPage}
                >
                  Start new replay
                </Button>
              </SpaceBetween>
            }
          >
            List of Replays
          </Header>
        }
        columnDefinitions={columnDefinitions}
        visibleColumns={preferences.visibleContent}
        items={items}
        loading={isLoading}
        loadingText="Loading resources"
        pagination={
          <Pagination {...paginationProps} ariaLabels={paginationLabels}/>
        }
        filter={
          <TextFilter
            {...filterProps}
            countText={getMatchesCountText(filteredItemsCount)}
            filteringAriaLabel="Filter replays"
          />
        }
        preferences={
          <CollectionPreferences
            {...collectionPreferencesProps}
            preferences={preferences}
            onConfirm={({detail}) => setPreferences(detail)}
          />
        }
      />
    </SpaceBetween>
  );
}
