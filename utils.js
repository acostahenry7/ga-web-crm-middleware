const generateUrlParams = (obj) => {
  let params = "";

  Object.entries(obj).map(([key, val], index) => {
    let div = "&";
    if (index == 0) div = "?";
    params += `${div}${key}=${val}`;
  });

  return params;
};
module.exports = {
  generateUrlParams,
};
