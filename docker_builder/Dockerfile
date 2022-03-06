FROM origam/server:master-latest AS base
USER origam
WORKDIR /home/origam/HTML5
RUN rm -r clients/origam 
RUN mkdir clients/origam
COPY --chown=origam:origam build clients/origam