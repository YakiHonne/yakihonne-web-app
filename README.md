# What is YakiHonne?

YakiHonne is the 1st Fully Decentralized Social Network on Bitcoin. Connecting 160+ countries globally, YakiHonne attracts 50K+ active Bitcoiners. Check it out at [yakihonne.com](https://yakihonne.com)

Currently, YakiHonne is partnering with BITMAIN, Bitcoin Magazine, and 30+ programs in BTC ecosystems, and even non-BTC programs. YakiHonne received grants/ supports from Gitcoin, Nostr, DoraHacks etc..

YakiHonne also runs its own relays under [nostr-01.yakihonne.com](https://nostr-01.yakihonne.com) and [nostr-02.yakihonne.com](https://nostr-02.yakihonne.com) for creators to publish their content, it is free of charge (atm). The relay is based on [strfry](https://github.com/hoytech/strfry) and written in cpp if you would like to check it out.

# 1. Features

## 1.1 Cient

- [x] Login options support: keys, wallet, on-the-go account creation (NIP-01, NIP-07)
- [x] Bech32 encoding support (NIP-19)
- [x] Global Feed based on user all relays
- [x] Custom Feed based on user following
- [x] Top creators list based on all relays/selected relay
- [x] Top curators list based on nostr-01.yaihonne.com relay
- [x] Latest discussed topics based on hashtags
- [x] Home carousel containing latest published curations
- [x] Curations: topic-related curated articles (NIP-51)
- [x] My curations, My articles sections as a space for creators to manage and organize their content
- [x] Rich markdown editor to write and preview long-form content (NIP-23)
- [x] The ability to draft/edit/delete articles (NIP-09, NIP-23)
- [x] Topic-related search using hashtags (NIP-12)
- [x] Users search using pubkeys
- [x] Built-in upload for user profile images and banners within nostr-01.yakikhonne.com
- [x] User profile page: following/followers/zapping/published articles
- [x] URI scheme support (currenly only naddr) (NIP-21)
- [x] Users follow/unfollow (NIP-02)
- [x] Lightning zaps: via QR codes or dedicted wallet (NIP-57)
- [x] Customizable user settings: Keypair, Lightning Addres, relay list
- [x] Relay list metadata support (NIP-65)

## 1.2 Relay

[nostr-01.yakihonne.com](https://nostr-01.yakihonne.com) and [nostr-02.yakihonne.com](https://nostr-02.yakihonne.com) relay is fully based on [strfry](https://github.com/hoytech/strfry) implementation and writted in Typescript.

# Run YakiHonne locally

- Clone the repository: `https://github.com/YakiHonne/yakihonne-web-app.git`
- Navigate to the main directory: `cd client`
- Install dependencies: `npm install`
- Run the app: `npm start`

# Run docker
For those who want to self-host, use the Dockerfile from the repository. Run commands in terminal:
- run: `docker build -t yakihonne-web-app .`
- and run: `docker run -p 3200:3200 yakihonne-web-app -d`
- access in the browser http://localhost:3200

## OR

# Run docker compose
Use the docker-compose.yml file from the repository and run:

- Download the Dockerfile and docker-compose.yml, place them in the same directory.
- run: `docker-compose up --build -d` or `docker compose up --build -d`
- access in the browser http://localhost:3200
