/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import TopNavigation from "@cloudscape-design/components/top-navigation";
import * as React from "react";
import {useEffect, useState} from "react";
import {useNavigate} from 'react-router-dom';
import {useAuthenticator} from "@aws-amplify/ui-react";

const profileActions = [
  {
    type: 'button',
    id: 'signout',
    text: 'Sign out',
  },
];

export function ServiceTopNavigation() {
  const {route, user, signOut} = useAuthenticator((context) => [
    context.route,
    context.user,
    context.signOut,
  ]);
  const navigate = useNavigate();
  const i18nStrings = {
    searchIconAriaLabel: 'Search',
    searchDismissIconAriaLabel: 'Close search',
    overflowMenuTriggerText: 'More',
    overflowMenuTitleText: 'All',
    overflowMenuBackIconAriaLabel: 'Back',
    overflowMenuDismissIconAriaLabel: 'Close menu',
  };

  const [profileDropdown, setProfileDropdown] = useState({});

  useEffect(() => {
    if (route === 'authenticated') {
      setProfileDropdown({
        type: 'menu-dropdown',
        text: user.attributes.email,
        description: user.attributes.email,
        iconName: 'user-profile',
        onItemClick: e => {
          if (e.detail.id === "signout") {
            signOut();
            navigate("/login")
          }
        },
        items: profileActions,
      });
    } else {
      setProfileDropdown({
        type: 'button',
        iconName: 'lock-private',
        title: 'Sign in',
        text: 'Sign in',
        onClick: () => navigate("/login"),
        href: '#',
        ariaLabel: 'Settings'
      })
    }
  }, [user, route])

  return (
    <TopNavigation
      i18nStrings={i18nStrings}
      identity={{
        href: "#",
        title: "Toolbox for AWS IoT",
      }}
      utilities={[
        profileDropdown
      ]}
    />
  );
}

export default ServiceTopNavigation