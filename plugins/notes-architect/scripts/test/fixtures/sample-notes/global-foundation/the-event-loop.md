# the event loop

the loop is the part that decides what runs next. it picks the next ready
callback and runs it to completion.

this is the mechanism named in [[what-is-x#what-is-x|the intro]]; the deep dive
on phases lives at [[the-event-loop#phases]].

## phases

each turn has ordered phases.[^1]

[^1]: X docs, "the loop" — https://example.com/x/loop
