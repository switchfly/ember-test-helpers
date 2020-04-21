import Application from '@ember/application';
import Resolver from '@ember/application/resolver';

import { Promise } from 'rsvp';

import legacyBuildRegistry from './-internal/build-registry';
import ContainerProxyMixin from '@ember/engine/-private/container-proxy-mixin';
import RegistryProxyMixin from '@ember/engine/-private/registry-proxy-mixin';
import CoreObject from '@ember/object/core';

export interface Owner extends CoreObject, ContainerProxyMixin, RegistryProxyMixin {
  _emberTestHelpersMockOwner?: boolean;

  _lookupFactory?(key: string): any;

  visit(url: string, options?: { [key: string]: any }): Promise<any>;
}

/**
  Creates an "owner" (an object that either _is_ or duck-types like an
  `Ember.ApplicationInstance`) from the provided options.

  If `options.application` is present (e.g. setup by an earlier call to
  `setApplication`) an `Ember.ApplicationInstance` is built via
  `application.buildInstance()`.

  If `options.application` is not present, we fall back to using
  `options.resolver` instead (setup via `setResolver`). This creates a mock
  "owner" by using a custom created combination of `Ember.Registry`,
  `Ember.Container`, `Ember._ContainerProxyMixin`, and
  `Ember._RegistryProxyMixin`.

  @private
  @param {Ember.Application} [application] the Ember.Application to build an instance from
  @param {Ember.Resolver} [resolver] the resolver to use to back a "mock owner"
  @returns {Promise<Ember.ApplicationInstance>} a promise resolving to the generated "owner"
*/
export default function buildOwner(
  application: Application | undefined | null,
  resolver: Resolver | undefined | null
): Promise<Owner> {
  if (application) {
    return (application.boot().then(app => app.buildInstance().boot()) as unknown) as Promise<
      Owner
    >;
  }

  if (!resolver) {
    throw new Error(
      'You must set up the ember-test-helpers environment with either `setResolver` or `setApplication` before running any tests.'
    );
  }

  let { owner } = legacyBuildRegistry(resolver) as { owner: Owner };
  return Promise.resolve(owner);
}
