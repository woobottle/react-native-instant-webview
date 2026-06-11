#import "InstantWebViewModule.h"
#ifndef RCT_NEW_ARCH_ENABLED
#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>
#endif

@interface InstantWebViewModule ()
#ifdef RCT_NEW_ARCH_ENABLED
<NativeInstantWebViewSpec>
#endif
@end

@implementation InstantWebViewModule {
  NSMapTable<NSNumber *, UIView *> *_detachedViews;
}

#ifdef RCT_NEW_ARCH_ENABLED
// Injected by React Native for modules that query UIViews by React tag.
// Works under bridgeless/Fabric (it bridges to the Fabric component view
// provider) as well as the legacy architecture.
@synthesize viewRegistry_DEPRECATED = _viewRegistry_DEPRECATED;
#endif

RCT_EXPORT_MODULE(InstantWebView)

- (instancetype)init {
  self = [super init];
  if (self) {
    _detachedViews = [NSMapTable strongToStrongObjectsMapTable];
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (dispatch_queue_t)methodQueue {
  return dispatch_get_main_queue();
}

// Codegen expects `double` for number params.
// In Old Architecture, RCT_EXPORT_METHOD handles JS number → double conversion.
// In New Architecture, the generated JSI binding uses double directly.

RCT_EXPORT_METHOD(detachView:(double)tag) {
  NSNumber *viewTag = @((NSInteger)tag);
#ifdef RCT_NEW_ARCH_ENABLED
  UIView *view = [self.viewRegistry_DEPRECATED viewForReactTag:viewTag];
  NSLog(@"[InstantWebView] detachView tag=%@ found=%d", viewTag, view != nil);
  if (view && view.superview) {
    [self->_detachedViews setObject:view forKey:viewTag];
    [view removeFromSuperview];
  }
#else
  RCTUIManager *uiManager = [self.bridge moduleForClass:[RCTUIManager class]];
  if (!uiManager) return;

  [uiManager addUIBlock:^(__unused RCTUIManager *manager,
                          NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = viewRegistry[viewTag];
    if (view && view.superview) {
      [self->_detachedViews setObject:view forKey:viewTag];
      [view removeFromSuperview];
    }
  }];
#endif
}

RCT_EXPORT_METHOD(attachView:(double)tag parentTag:(double)parentTag) {
  NSNumber *viewTag = @((NSInteger)tag);
  NSNumber *parentViewTag = @((NSInteger)parentTag);
#ifdef RCT_NEW_ARCH_ENABLED
  UIView *view = [self->_detachedViews objectForKey:viewTag];
  UIView *parent = [self.viewRegistry_DEPRECATED viewForReactTag:parentViewTag];
  NSLog(@"[InstantWebView] attachView tag=%@ parent=%d", viewTag, parent != nil);
  if (view && parent) {
    [parent addSubview:view];
    [self->_detachedViews removeObjectForKey:viewTag];
  }
#else
  RCTUIManager *uiManager = [self.bridge moduleForClass:[RCTUIManager class]];
  if (!uiManager) return;

  [uiManager addUIBlock:^(__unused RCTUIManager *manager,
                          NSDictionary<NSNumber *, UIView *> *viewRegistry) {
    UIView *view = [self->_detachedViews objectForKey:viewTag];
    UIView *parent = viewRegistry[parentViewTag];
    if (view && parent) {
      [parent addSubview:view];
      [self->_detachedViews removeObjectForKey:viewTag];
    }
  }];
#endif
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeInstantWebViewSpecJSI>(params);
}
#endif

@end
