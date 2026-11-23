import type { CSSProperties } from "react";
import { Icon } from "./Layout";
import { ResourceLink } from "../pages/PublicPages";
import { safeUrl } from "../models/content";
import { useSiteSettings } from "../hooks/useSiteSettings";
const bundledPortrait = "/img/hero/author-1141.webp";
const bundledLibrary = "/img/hero/library-1672.webp";
export function HomeHero() {
  const settings = useSiteSettings();
  return (
    <section
      className="editorial-hero"
      aria-labelledby="home-title"
      style={
        { "--portrait-height": `${settings.homeImageSize}px` } as CSSProperties
      }
    >
      <picture className="editorial-hero__background" aria-hidden="true">
        {settings.homeBackground === bundledLibrary && (
          <>
            <source
              media="(max-width: 767px)"
              srcSet="/img/hero/library-mobile-640.webp 640w, /img/hero/library-mobile-960.webp 960w"
              sizes="100vw"
            />
            <source
              srcSet="/img/hero/library-1024.webp 1024w, /img/hero/library-1672.webp 1672w"
              sizes="100vw"
            />
          </>
        )}
        <img
          src={safeUrl(settings.homeBackground, true)}
          width="1672"
          height="941"
          alt=""
          fetchPriority="high"
        />
      </picture>
      <div className="editorial-hero__container">
        <div
          className={`editorial-hero__visual editorial-hero__visual--${settings.homeImageShape}`}
        >
          <picture
            className={`editorial-hero__portrait${settings.homeImage === bundledPortrait ? " editorial-hero__portrait--adaptive" : ""}`}
          >
            {settings.homeImage === bundledPortrait && (
              <source
                media="(min-width: 1366px)"
                type="image/webp"
                srcSet="/img/hero/seated-560.webp 560w, /img/hero/seated-840.webp 840w, /img/hero/seated-1122.webp 1122w"
                sizes="(min-width: 1600px) 650px, 48vw"
              />
            )}
            {settings.homeImage === bundledPortrait && (
              <source
                type="image/webp"
                srcSet="/img/hero/author-480.webp 480w, /img/hero/author-768.webp 768w, /img/hero/author-1141.webp 1141w"
                sizes="(max-width: 767px) min(88vw, 340px), 360px"
              />
            )}
            <img
              src={safeUrl(settings.homeImage, true)}
              alt={settings.homeImageAlt}
              width="1141"
              height="1379"
              fetchPriority="high"
              loading="eager"
            />
          </picture>
        </div>
        <div className="editorial-hero__content">
          <p className="editorial-hero__eyebrow">
            <Icon name="feather-alt" /> {settings.homeEyebrow}
          </p>
          <h1 id="home-title" className="editorial-hero__title">
            {settings.homeTitle}
            <br />
            <span>{settings.homeEmphasis}</span>
          </h1>
          <div className="editorial-hero__divider" aria-hidden="true" />
          <p className="editorial-hero__description">
            {settings.homeDescription}
          </p>
          <div className="editorial-hero__actions">
            <ResourceLink
              url={settings.homePrimaryUrl}
              className="btn btn--solid"
            >
              <Icon name="book-open" /> {settings.homePrimaryLabel}
            </ResourceLink>
            <ResourceLink
              url={settings.homeSecondaryUrl}
              className="btn btn--outline"
            >
              {settings.homeSecondaryLabel} <Icon name="chevron-right" />
            </ResourceLink>
          </div>
        </div>
      </div>
    </section>
  );
}
