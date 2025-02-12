function addHeadContent() {
  // meta tags
  let metaCharset = document.createElement("meta");
  metaCharset.setAttribute("charset", "UTF-8");

  let metaViewport = document.createElement("meta");
  metaViewport.setAttribute("name", "viewport");
  metaViewport.setAttribute("content", "width=device-width, initial-scale=1.0");

  //title
  let title = document.createElement("title");
  title.textContent = "Web Dashboard | Vehicle Detection";

  // favicon links
  let favicon16 = createFaviconLink(
    "../images/Web/icons8-dashboard-cute-color-16.png",
    "16x16"
  );
  let favicon32 = createFaviconLink(
    "../images/Web/icons8-dashboard-cute-color-32.png",
    "32x32"
  );
  let favicon72 = createFaviconLink(
    "../images/Android Chrome/icons8-dashboard-cute-color-72.png",
    "72x72"
  );
  let favicon96 = createFaviconLink(
    "../images/Web/icons8-dashboard-cute-color-96.png",
    "96x96"
  );

  // bootstrap CSS link
  let bootstrapCSS = createStylesheetLink(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
  );

  //bootstrap js
  let bootstrapJS = createScript(
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
  );

  // google fonts link
  let googleFonts = createStylesheetLink(
    "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
  );

  // font awesome link
  let fontAwesome = createStylesheetLink(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
  );

  // chart.js script
  let chartJS = createScript("https://cdn.jsdelivr.net/npm/chart.js");

  //sweet alert script
  let sweetAlert = createScript("https://cdn.jsdelivr.net/npm/sweetalert2@11");

  // css for all pages
  let stylesCSS = createStylesheetLink("../css/styles.css");

  // append all elements to the head
  let head = document.head;
  head.append(
    metaCharset,
    metaViewport,
    title,
    favicon16,
    favicon32,
    favicon72,
    favicon96,
    bootstrapCSS,
    bootstrapJS,
    googleFonts,
    fontAwesome,
    chartJS,
    stylesCSS,
    sweetAlert
  );
}

function createFaviconLink(href, sizes) {
  let link = document.createElement("link");
  link.setAttribute("rel", "icon");
  link.setAttribute("type", "image/png");
  link.setAttribute("sizes", sizes);
  link.setAttribute("href", href);
  return link;
}

function createStylesheetLink(href) {
  let link = document.createElement("link");
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", href);
  return link;
}

function createScript(src) {
  let script = document.createElement("script");
  script.setAttribute("src", src);
  return script;
}

// call the function to add head content
addHeadContent();
