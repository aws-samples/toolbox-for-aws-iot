/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect} from "react";

import {Authenticator, ThemeProvider, useAuthenticator} from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

import {useLocation, useNavigate} from 'react-router';

import * as awsui from '@cloudscape-design/design-tokens';

const authTheme = {
  name: 'Auth  Theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          '80': awsui.colorBackgroundButtonPrimaryDefault
        },
      },
    },
  },
};

export function Login() {
  const {route} = useAuthenticator((context) => [context.route]);
  const location = useLocation();
  const navigate = useNavigate();
  let from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (route === 'authenticated') {
      navigate(from, {replace: true});
    }
  }, [route, navigate, from]);
  return (
    <ThemeProvider theme={authTheme}>
      <Authenticator hideSignUp={true}></Authenticator>
    </ThemeProvider>
  );
}