import { camelCaseObject } from '@edx/frontend-platform';
import { logError, logInfo } from '@edx/frontend-platform/logging';
import { call, put, takeEvery } from 'redux-saga/effects';
import { customBackend } from "../../constants";

import {
  fetchRealtimeValidationsBegin,
  fetchRealtimeValidationsFailure,
  fetchRealtimeValidationsSuccess,
  REGISTER_FORM_VALIDATIONS,
  REGISTER_NEW_USER,
  registerNewUserBegin,
  registerNewUserFailure,
  registerNewUserSuccess,
} from './actions';
import { INTERNAL_SERVER_ERROR } from './constants';
import { getFieldsValidations, registerRequest } from './service';

export function* handleNewUserRegistration(action) {
  try {
    console.log("inside signup user funtion");
    const { email, password } = action.payload.registrationInfo;
    yield put(registerNewUserBegin());

    const { authenticatedUser, redirectUrl, success } = yield call(registerRequest, action.payload.registrationInfo);

    yield put(registerNewUserSuccess(
      camelCaseObject(authenticatedUser),
      redirectUrl,
      success,
    ));


    try {
   
      
      const uri = customBackend.url + "/api/openedx/user/register_edx_user";
      const requestBody = {
        email,
        password,
        edx_based_id:authenticatedUser?.user_id
      };

      fetch(uri, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Error: ${res.status} ${res.statusText}`);
          }
          return res.json();
        })
        .then((data) => {
          console.log("Response data custom backend:", data);
        })
        .catch((error) => {
          console.error("custom backend catach error:", error);
        });
    } catch (error) {
      console.log("custom backend catach catch error:",error);
      
    }
  } catch (e) {
    const statusCodes = [400, 403, 409];
    if (e.response && statusCodes.includes(e.response.status)) {
      yield put(registerNewUserFailure(camelCaseObject(e.response.data)));
      logInfo(e);
    } else {
      yield put(registerNewUserFailure({ errorCode: INTERNAL_SERVER_ERROR }));
      logError(e);
    }
  }
}

export function* fetchRealtimeValidations(action) {
  try {
    yield put(fetchRealtimeValidationsBegin());
    const { fieldValidations } = yield call(getFieldsValidations, action.payload.formPayload);

    yield put(fetchRealtimeValidationsSuccess(camelCaseObject(fieldValidations)));
  } catch (e) {
    if (e.response && e.response.status === 403) {
      yield put(fetchRealtimeValidationsFailure());
      logInfo(e);
    } else {
      logError(e);
    }
  }
}
export default function* saga() {
  yield takeEvery(REGISTER_NEW_USER.BASE, handleNewUserRegistration);
  yield takeEvery(REGISTER_FORM_VALIDATIONS.BASE, fetchRealtimeValidations);
}
