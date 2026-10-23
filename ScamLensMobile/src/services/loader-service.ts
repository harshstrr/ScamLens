let loaderHandler: ((visible: boolean) => void) | null = null;
let requestCount = 0;

export const setLoaderHandler = (handler: (visible: boolean) => void) => {
  loaderHandler = handler;
};

export const showLoader = () => {
  requestCount++;
  loaderHandler && loaderHandler(true);
};

export const hideLoader = () => {
  requestCount--;

  if (requestCount <= 0) {
    loaderHandler && loaderHandler(false);
    requestCount = 0;
  }
};