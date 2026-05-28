import React from "react";
import ArticleItem from "../../../../components/ContentLists/Manual/ArticleItem";
import { render } from "@testing-library/react";

const renderItem = (overrides) =>
  render(
    <ArticleItem
      item={{
        title: "Test 9",
        updated_at: "2026-05-28T08:42:19+00:00",
        created_at: "2026-05-28T08:40:47+00:00",
        ...overrides,
      }}
      openPreview={jest.fn()}
      previewItem={{}}
      index={0}
    />
  );

describe("ContentLists/Manual/ArticleItem", () => {
  const item = {
    title: "test",
    status: "published",
    category: "FIXME1",
    authors: [{ name: "author" }],
    updated_at: "2017-07-26T13:43:33+00:00",
    created_at: "2017-07-25T10:00:00+00:00",
    article_statistics: {
      page_views_number: 10,
      internal_click_rate: 5,
      impressions_number: 15
    }
  };

  it("renders correctly without extras", () => {
    const { container } = render(
      <ArticleItem
        item={item}
        openPreview={jest.fn()}
        previewItem={{}}
        index={1}
      />
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders correctly with extras", () => {
    const { container } = render(
      <ArticleItem
        item={item}
        openPreview={jest.fn()}
        previewItem={{}}
        showExtras={true}
        index={1}
      />
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows the category label alongside pinned for a pinned published item", () => {
    const { getByText } = renderItem({
      status: "published",
      category: "FIXME1",
      sticky: true,
    });

    expect(getByText("FIXME1")).toBeTruthy();
    expect(getByText("pinned")).toBeTruthy();
  });

  it("shows the status label alongside pinned for a pinned in-progress item", () => {
    const { getByText } = renderItem({
      status: "in_progress",
      sticky: true,
    });

    expect(getByText("In progress")).toBeTruthy();
    expect(getByText("pinned")).toBeTruthy();
  });

});
