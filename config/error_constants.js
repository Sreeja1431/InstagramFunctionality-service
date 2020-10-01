const ERR_USR_EXIST = 'User Already Exists';
const ERR_EMAIL_VERIFY = 'Email Verified Already';
 const ERR_EMAIL_NOT_VERIFY = 'Account not verified';
 const ERR_INVALID_TOKEN = 'Token is not valid';
 const ERR_NO_TOKEN = 'No Token, authorization denied';
 const ERR_PWD = 'Invalid Credentials';
 const ERR_USR_NOT_EXIST = 'User Doesn`t Exist';
 const ERR_OTP_WRONG = 'OTP Is Incorrect';
 const ERR_SERVER = 'Server Error';

module.exports = {
    ERR_SERVER, ERR_EMAIL_NOT_VERIFY, ERR_INVALID_TOKEN,
    ERR_USR_EXIST, ERR_NO_TOKEN, ERR_USR_NOT_EXIST, ERR_EMAIL_VERIFY, ERR_OTP_WRONG, ERR_PWD
}