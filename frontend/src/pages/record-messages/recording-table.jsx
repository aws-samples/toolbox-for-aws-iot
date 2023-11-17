/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useState} from 'react';
import {useCollection} from '@cloudscape-design/collection-hooks';
import {API} from "aws-amplify";
import {ENDPOINT_GET_RECORD_MESSAGES, ENDPOINT_START_RECORD_MESSAGES, TOOLBOX_API} from "../../commons/constants";
import {
  Box,
  Button,
  CollectionPreferences,
  Header,
  Icon,
  Pagination,
  SpaceBetween,
  Table,
  TextFilter
} from '@cloudscape-design/components';
import {collectionPreferencesProps, columnDefinitions, getMatchesCountText, paginationLabels} from './table-config';

function EmptyState({title, subtitle, action}) {
  return (
    <Box textAlign="center" color="inherit">
      <Box variant="strong" textAlign="center" color="inherit">
        {title}
      </Box>
      <Box variant="p" padding={{bottom: 's'}} color="inherit">
        {subtitle}
      </Box>
      {action}
    </Box>
  );
}

export default function RecordingTable({reloadRecords, onRecordsLoaded, headerButtons, footerButtons}) {

  const [allItems, setAllItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  async function getRecords() {
    setIsLoading(true);

    await API.get(TOOLBOX_API, ENDPOINT_GET_RECORD_MESSAGES, {})
      .then((data) => {
        setIsLoading(false);
        setAllItems(data.items);
        setIsLoading(false)
        onRecordsLoaded();
        console.log(data.items);

        if (data.error) {
          console.log(data.error)
        }

      })
      .catch((error) => {
        console.log(error);
        setIsLoading(false);
      });
  }

  useEffect(() => {
    if (reloadRecords) getRecords();
  }, [reloadRecords]);


  const [preferences, setPreferences] = useState({
    pageSize: 10,
    visibleContent: ["name", "status", "topic", "createdAt", "stoppedAt", "duration"]
  });
  const {items, actions, filteredItemsCount, collectionProps, filterProps, paginationProps} = useCollection(
    allItems,
    {
      filtering: {
        empty: (
          <EmptyState
            title="No recordings"
            subtitle="No recordings to display."
          />
        ),
        noMatch: (
          <EmptyState
            title="No matches"
            subtitle="We can’t find a match."
            action={<Button onClick={() => actions.setFiltering('')}>Clear filter</Button>}
          />
        ),
      },
      pagination: {pageSize: preferences.pageSize},
      sorting: {
        defaultState: {
          sortingColumn: {
            sortingField: "createdAt",
            sortingComparator: (a, b) =>
              a.createdAt.valueOf() - b.createdAt.valueOf(),
          },
          isDescending: true
        }
      },
      selection: {},
    }
  );
  const {selectedItems} = collectionProps;

  return (
    <SpaceBetween size={"l"}>
      <Table
        {...collectionProps}
        selectionType="multi"
        header={
          <Header
            counter={selectedItems.length ? `(${selectedItems.length}/${allItems.length})` : `(${allItems.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={() => getRecords()}><Icon name="refresh"/></Button>
                {headerButtons && headerButtons(selectedItems)
                  .map(item => <Button variant={item.variant} loading={item.loading} disabled={item.disabled}
                                       onClick={item.onClick} key={item.text}>{item.text}</Button>)
                }
              </SpaceBetween>
            }
          >
            List of Recordings
          </Header>
        }
        columnDefinitions={columnDefinitions}
        visibleColumns={preferences.visibleContent}
        items={items}
        loading={isLoading}
        loadingText="Loading resources"
        pagination={<Pagination {...paginationProps} ariaLabels={paginationLabels}/>}
        filter={
          <TextFilter
            {...filterProps}
            countText={getMatchesCountText(filteredItemsCount)}
            filteringAriaLabel="Filter recordings"
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
      {footerButtons &&
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
            {footerButtons(selectedItems)
              .map(item => <Button variant={item.variant} loading={item.loading || false}
                                   disabled={item.disabled || false} onClick={item.onClick}
                                   key={item.text}>{item.text}</Button>)
            }
          </SpaceBetween>
        </Box>
      }
    </SpaceBetween>
  );
}
