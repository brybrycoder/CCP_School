import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "ap-southeast-1_XXXXXXX",
      userPoolClientId: "5q82nclncp0cc4ghrcfjutf76o",
    },
  },
});