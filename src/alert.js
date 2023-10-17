module.exports = {
    send(client, channelID, message) {
        const channel = client.channels.cache.get(channelID);
        channel.send(message);
    }
}