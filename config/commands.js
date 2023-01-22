// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ApplicationCommandOptionType } = require("discord-api-types/v9");

module.exports = [
    {
        name: "ping",
        description: "Replies with pong!"
    },
    {
        name: "start",
        description: "Start a quest for a party",
        options: [
            {
                name: "player1",
                description: "Player 1",
                type: ApplicationCommandOptionType.Mentionable,
                required: true
            },
            {
                name: "player2",
                description: "Player 2",
                type: ApplicationCommandOptionType.Mentionable
            },
            {
                name: "player3",
                description: "Player 3",
                type: ApplicationCommandOptionType.Mentionable
            },
            {
                name: "player4",
                description: "Player 4",
                type: ApplicationCommandOptionType.Mentionable
            },
            {
                name: "player5",
                description: "Player 5",
                type: ApplicationCommandOptionType.Mentionable
            }
        ]
    }
];
