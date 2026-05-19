import React from "react";
import PropTypes from "prop-types";

import ArticlePreview from "../generic/ArticlePreview";

// Renders whatever article payload is in props directly. The previous
// implementation called publisher.getArticle to fetch a full record from
// Publisher; that's a no-go now that this view works without Publisher.
const PreviewPane = ({ article, close }) => {
  if (!article) return null;
  const previewArticle = { ...article, slideshows: null };
  return <ArticlePreview article={previewArticle} close={close} />;
};

PreviewPane.propTypes = {
  close: PropTypes.func.isRequired,
  article: PropTypes.object,
};

export default PreviewPane;
